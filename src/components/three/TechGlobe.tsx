"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const TEAL = new THREE.Color("#48b8b1");
const RED = new THREE.Color("#d8413a");
const TEAL_HEX = "#48b8b1";
const RED_HEX = "#d8413a";

const GLOBE_R = 2.5;
const TILT = 0.42; // ≈ 24° axial tilt

export type TierData = { label: string; tech: string[] };
export type EdgeSpec = {
  from: [number, number];
  to: [number, number];
  kind?: "audit";
};

// Authored placement: lat/lng per node. Keyed by `${tierIdx}-${techIdx}` to match
// dict.technology.tiers. Reorder the dict and these will need updating.
const NODE_LATLNG: Record<string, [number, number]> = {
  "0-0": [38, -85],    // .NET
  "0-1": [38, 75],     // Oracle APEX
  "1-0": [4, -8],      // Oracle Database
  "2-0": [-34, -130],  // Bitdefender
  "2-1": [-34, 0],     // ISO 27001
  "2-2": [-34, 130],   // ISO 9001
};

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function latLngToVec(latDeg: number, lngDeg: number, radius: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lng = (lngDeg * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lng) * radius,
    Math.sin(lat) * radius,
    Math.cos(lat) * Math.sin(lng) * radius
  );
}

// Quadratic-bezier arc from `a` to `b` with the apex pulled radially outward;
// height scales with angular distance so cross-globe arcs reach higher.
function buildArc(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const cosAngle = a.dot(b) / (a.length() * b.length());
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  const height = GLOBE_R * (1.04 + Math.sin(angle / 2) * 0.55);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  if (mid.length() < 0.001) {
    // Antipodal — pick a perpendicular axis so the arc has a defined plane.
    const perp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(a.clone().normalize().dot(perp)) > 0.95) perp.set(1, 0, 0);
    mid.copy(perp).multiplyScalar(height);
  } else {
    mid.normalize().multiplyScalar(height);
  }
  // Lift endpoints just off the surface to avoid z-fighting with the globe mesh.
  const aExt = a.clone().normalize().multiplyScalar(GLOBE_R * 1.012);
  const bExt = b.clone().normalize().multiplyScalar(GLOBE_R * 1.012);
  return new THREE.QuadraticBezierCurve3(aExt, mid, bExt);
}

// ─── Globe (solid occluder + wireframe shell + scattered surface points) ─────
function Globe() {
  const surfacePositions = useMemo(() => {
    const rng = makeRng(0xa0bd);
    const count = 320;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform point on a unit sphere via inverse-CDF in u
      const u = rng() * 2 - 1;
      const theta = rng() * Math.PI * 2;
      const rho = Math.sqrt(1 - u * u);
      const r = GLOBE_R * 1.003;
      arr[i * 3 + 0] = rho * Math.cos(theta) * r;
      arr[i * 3 + 1] = u * r;
      arr[i * 3 + 2] = rho * Math.sin(theta) * r;
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Solid occluder — opaque so far-side arcs/particles get depth-tested
         out. Slightly under the wireframe shell. */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 0.985, 64, 36]} />
        <meshBasicMaterial color={new THREE.Color(0x080c14)} />
      </mesh>
      {/* Wireframe shell — the network lines */}
      <mesh>
        <sphereGeometry args={[GLOBE_R, 36, 22]} />
        <meshBasicMaterial color={TEAL} wireframe transparent opacity={0.13} />
      </mesh>
      {/* Surface dots */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[surfacePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={TEAL}
          size={0.028}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Faint particle halo around the globe — static, not in the rotating group.
function Atmosphere() {
  const positions = useMemo(() => {
    const rng = makeRng(0xaabb);
    const count = 220;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = GLOBE_R + 0.4 + rng() * 2.2;
      const u = rng() * 2 - 1;
      const theta = rng() * Math.PI * 2;
      const rho = Math.sqrt(1 - u * u);
      arr[i * 3 + 0] = rho * Math.cos(theta) * r;
      arr[i * 3 + 1] = u * r;
      arr[i * 3 + 2] = rho * Math.sin(theta) * r;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={TEAL}
        size={0.024}
        transparent
        opacity={0.28}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Tech node + label (label fades on the far side of the globe) ────────────
function TechNode({
  position,
  name,
  isSecurity,
  isHovered,
  isAnyHovered,
  onEnter,
  onLeave,
}: {
  position: THREE.Vector3;
  name: string;
  isSecurity: boolean;
  isHovered: boolean;
  isAnyHovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const colorHex = isSecurity ? RED_HEX : TEAL_HEX;
  const colorObj = isSecurity ? RED : TEAL;

  useFrame(({ camera }) => {
    if (!groupRef.current || !labelRef.current) return;
    groupRef.current.getWorldPosition(worldPos);
    // Cosine of angle between (camera-to-origin) and (origin-to-node).
    // > 0 means node is on the near hemisphere relative to camera.
    const camDir = camera.position.clone().normalize();
    const nodeDir = worldPos.clone().normalize();
    const front = camDir.dot(nodeDir); // 1 = directly facing, -1 = far side
    const fade = Math.max(0, Math.min(1, (front - 0.05) / 0.45));
    const base = isHovered ? 1 : isAnyHovered ? 0.22 : 0.95;
    labelRef.current.style.opacity = String(fade * base);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Bright core */}
      <mesh>
        <sphereGeometry args={[0.06, 14, 14]} />
        <meshBasicMaterial color={colorObj} />
      </mesh>
      {/* Soft halo */}
      <mesh>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Label */}
      <Html center distanceFactor={6} style={{ pointerEvents: "auto", userSelect: "none" }}>
        <div
          ref={labelRef}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          className="whitespace-nowrap mono uppercase tracking-[0.18em] text-[11px] px-2 py-1 cursor-pointer flex items-center gap-1.5"
          style={{
            color: colorHex,
            textShadow: isHovered ? `0 0 12px ${colorHex}` : "none",
            transform: `translate(0, -24px) scale(${isHovered ? 1.3 : 1})`,
            transition: "transform 200ms ease, text-shadow 200ms ease",
          }}
        >
          <span
            className="inline-block h-1 w-1 rounded-full"
            style={{ background: colorHex, boxShadow: isHovered ? `0 0 6px ${colorHex}` : "none" }}
          />
          {name}
        </div>
      </Html>
    </group>
  );
}

// ─── Particle arc — N particles ride a great-circle bezier between two nodes ─
function Arc({
  from,
  to,
  isAudit,
  isLit,
  particleCount = 18,
  seed,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  isAudit: boolean;
  isLit: boolean;
  particleCount?: number;
  seed: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const curve = useMemo(() => buildArc(from, to), [from, to]);

  const data = useMemo(() => {
    const rng = makeRng(seed);
    const positions = new Float32Array(particleCount * 3);
    const offsets = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) offsets[i] = i / particleCount;
    // Per-arc speed (slight variation)
    const speed = 0.13 + rng() * 0.08;
    return { positions, offsets, speed };
  }, [particleCount, seed]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const colorObj = isAudit ? RED : TEAL;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < particleCount; i++) {
      const u = (t * data.speed + data.offsets[i]) % 1;
      curve.getPoint(u, tmp);
      data.positions[i * 3 + 0] = tmp.x;
      data.positions[i * 3 + 1] = tmp.y;
      data.positions[i * 3 + 2] = tmp.z;
    }
    if (ref.current) {
      (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={colorObj}
        size={0.075}
        transparent
        opacity={isLit ? 0.95 : 0.18}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────
function Scene({
  tiers,
  edges,
}: {
  tiers: TierData[];
  edges: EdgeSpec[];
}) {
  const rotating = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      tiers.flatMap((tier, ti) =>
        tier.tech.map((name, idx) => {
          const key = `${ti}-${idx}`;
          const latLng = NODE_LATLNG[key] ?? [0, 0];
          return {
            key,
            tier: ti,
            name,
            isSecurity: ti === tiers.length - 1,
            position: latLngToVec(latLng[0], latLng[1], GLOBE_R),
          };
        })
      ),
    [tiers]
  );

  const nodeByKey = useMemo(() => {
    const m = new Map<string, (typeof nodes)[number]>();
    nodes.forEach((n) => m.set(n.key, n));
    return m;
  }, [nodes]);

  useFrame((_, delta) => {
    if (!rotating.current) return;
    // Slow down while hovering so the active label stays readable.
    const speed = hovered === null ? 0.07 : 0.012;
    rotating.current.rotation.y += delta * speed;
  });

  return (
    <>
      <Atmosphere />
      <group rotation={[0, 0, TILT]}>
        <group ref={rotating}>
          <Globe />
          {nodes.map((n) => (
            <TechNode
              key={n.key}
              position={n.position}
              name={n.name}
              isSecurity={n.isSecurity}
              isHovered={hovered === n.key}
              isAnyHovered={hovered !== null}
              onEnter={() => setHovered(n.key)}
              onLeave={() =>
                setHovered((h) => (h === n.key ? null : h))
              }
            />
          ))}
          {edges.map((e, idx) => {
            const fk = `${e.from[0]}-${e.from[1]}`;
            const tk = `${e.to[0]}-${e.to[1]}`;
            const a = nodeByKey.get(fk);
            const b = nodeByKey.get(tk);
            if (!a || !b) return null;
            const isLit =
              hovered === null || hovered === fk || hovered === tk;
            return (
              <Arc
                key={`${fk}_${tk}`}
                from={a.position}
                to={b.position}
                isAudit={e.kind === "audit"}
                isLit={isLit}
                seed={0x100 + idx * 7919}
              />
            );
          })}
        </group>
      </group>
    </>
  );
}

export default function TechGlobe({
  tiers,
  edges,
}: {
  tiers: TierData[];
  edges: EdgeSpec[];
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <Scene tiers={tiers} edges={edges} />
      </Suspense>
    </Canvas>
  );
}
