"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const TEAL = new THREE.Color("#48b8b1");
const RED = new THREE.Color("#d8413a");
const TEAL_HEX = "#48b8b1";
const RED_HEX = "#d8413a";

export type TierData = { label: string; tech: string[] };
export type EdgeSpec = {
  from: [number, number];
  to: [number, number];
  kind?: "audit";
};

// Hand-placed positions keyed by `${tierIdx}-${techIdx}`. Reorder the dict and
// these will need updating. Designed so app tier sits left, data center, security
// right, with z variation for depth parallax as the cluster rotates.
const ORB_POSITIONS: Record<string, [number, number, number]> = {
  "0-0": [-3.0, 1.3, 0.3],    // .NET
  "0-1": [-2.7, -1.3, -0.6],  // Oracle APEX
  "1-0": [0.1, 0.2, 0.5],     // Oracle DB
  "2-0": [2.7, 1.1, 0.4],     // Bitdefender
  "2-1": [3.1, -0.3, -0.7],   // ISO 27001
  "2-2": [2.5, -1.5, 0.5],    // ISO 9001
};

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─── Single tech orb — wireframe icosahedron + glowing core ──────────────────
function Orb({
  position,
  isSecurity,
  isHovered,
  isAnyHovered,
  seed,
}: {
  position: [number, number, number];
  isSecurity: boolean;
  isHovered: boolean;
  isAnyHovered: boolean;
  seed: number;
}) {
  const wire = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const colorObj = isSecurity ? RED : TEAL;

  // Per-orb rotation speeds so the cluster has individual life.
  const rot = useMemo(() => {
    const rng = makeRng(seed);
    return { y: 0.25 + rng() * 0.4, x: -0.15 + rng() * 0.35 };
  }, [seed]);

  useFrame((state, delta) => {
    if (wire.current) {
      wire.current.rotation.y += delta * rot.y;
      wire.current.rotation.x += delta * rot.x;
    }
    if (core.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.8 + seed * 0.001) * 0.12;
      core.current.scale.setScalar(pulse * (isHovered ? 1.45 : 1));
    }
  });

  const dimmed = isAnyHovered && !isHovered;

  return (
    <group position={position}>
      <mesh ref={wire}>
        <icosahedronGeometry args={[0.38, 1]} />
        <meshBasicMaterial
          color={colorObj}
          wireframe
          transparent
          opacity={dimmed ? 0.22 : isHovered ? 0.85 : 0.6}
        />
      </mesh>
      <mesh ref={core}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={dimmed ? 0.3 : 0.95}
        />
      </mesh>
      {/* Hover halo */}
      {isHovered && (
        <mesh>
          <sphereGeometry args={[0.55, 18, 18]} />
          <meshBasicMaterial
            color={colorObj}
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── DOM label sitting just above each orb ───────────────────────────────────
function Label({
  position,
  name,
  isSecurity,
  isHovered,
  isAnyHovered,
  onEnter,
  onLeave,
}: {
  position: [number, number, number];
  name: string;
  isSecurity: boolean;
  isHovered: boolean;
  isAnyHovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const colorHex = isSecurity ? RED_HEX : TEAL_HEX;
  const opacity = isHovered ? 1 : isAnyHovered ? 0.22 : 0.92;
  return (
    <Html
      position={position}
      center
      distanceFactor={6}
      style={{ pointerEvents: "auto", userSelect: "none" }}
    >
      <div
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="whitespace-nowrap mono uppercase tracking-[0.18em] text-[11px] px-2 py-1 cursor-pointer flex items-center gap-1.5"
        style={{
          color: colorHex,
          opacity,
          textShadow: isHovered ? `0 0 12px ${colorHex}` : "none",
          transform: `translate(0, -38px) scale(${isHovered ? 1.3 : 1})`,
          transition: "opacity 200ms, transform 200ms",
        }}
      >
        <span
          className="inline-block h-1 w-1 rounded-full"
          style={{ background: colorHex }}
        />
        {name}
      </div>
    </Html>
  );
}

// ─── Particle arc between two orbs ───────────────────────────────────────────
function Arc({
  from,
  to,
  isAudit,
  isLit,
  particleCount = 14,
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
  const colorObj = isAudit ? RED : TEAL;

  // Quadratic bezier with the apex offset perpendicular to the line, giving
  // each arc a gentle bow without all arcs bending the same way.
  const curve = useMemo(() => {
    const rng = makeRng(seed);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from).normalize();
    // Build a perpendicular in a rng-perturbed plane so the arcs don't
    // all bend in the XY plane.
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(up)) > 0.95) up = new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize();
    // Rotate the perpendicular randomly around `dir` so each arc bends differently
    const rotAngle = rng() * Math.PI * 2;
    perp.applyAxisAngle(dir, rotAngle);
    const dist = from.distanceTo(to);
    const arcHeight = dist * 0.18 + 0.2;
    mid.addScaledVector(perp, arcHeight);
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to, seed]);

  const data = useMemo(() => {
    const rng = makeRng(seed + 1);
    const positions = new Float32Array(particleCount * 3);
    const offsets = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) offsets[i] = i / particleCount;
    const speed = 0.16 + rng() * 0.08;
    return { positions, offsets, speed };
  }, [particleCount, seed]);

  const tmp = useMemo(() => new THREE.Vector3(), []);

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
        size={0.07}
        transparent
        opacity={isLit ? 0.95 : 0.13}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Sparse ambient cloud behind the cluster — gives a sense of space without
// competing with the orbs.
function Ambient({ count = 180 }: { count?: number }) {
  const positions = useMemo(() => {
    const rng = makeRng(0xabba);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (rng() - 0.5) * 14;
      arr[i * 3 + 1] = (rng() - 0.5) * 8;
      arr[i * 3 + 2] = (rng() - 0.5) * 8 - 2;
    }
    return arr;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={TEAL}
        size={0.025}
        transparent
        opacity={0.32}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene({
  tiers,
  edges,
}: {
  tiers: TierData[];
  edges: EdgeSpec[];
}) {
  const cluster = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      tiers.flatMap((tier, ti) =>
        tier.tech.map((name, idx) => {
          const key = `${ti}-${idx}`;
          const pos = ORB_POSITIONS[key] ?? [0, 0, 0];
          return {
            key,
            tier: ti,
            name,
            isSecurity: ti === tiers.length - 1,
            position: pos,
            vec: new THREE.Vector3(pos[0], pos[1], pos[2]),
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

  useFrame((state, delta) => {
    if (!cluster.current) return;
    const speed = hovered === null ? 0.05 : 0.006;
    cluster.current.rotation.y += delta * speed;
    cluster.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
  });

  return (
    <>
      <Ambient />
      <group ref={cluster}>
        {nodes.map((n, idx) => (
          <Orb
            key={`orb-${n.key}`}
            position={n.position}
            isSecurity={n.isSecurity}
            isHovered={hovered === n.key}
            isAnyHovered={hovered !== null}
            seed={0x100 + idx * 1031}
          />
        ))}
        {nodes.map((n) => (
          <Label
            key={`label-${n.key}`}
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
              key={`arc-${idx}`}
              from={a.vec}
              to={b.vec}
              isAudit={e.kind === "audit"}
              isLit={isLit}
              seed={0x500 + idx * 1009}
            />
          );
        })}
      </group>
    </>
  );
}

export default function TechConstellation({
  tiers,
  edges,
}: {
  tiers: TierData[];
  edges: EdgeSpec[];
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 8], fov: 45 }}
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
