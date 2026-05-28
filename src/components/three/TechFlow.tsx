"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const TEAL = new THREE.Color("#48b8b1");
const RED = new THREE.Color("#d8413a");
const TEAL_HEX = "#48b8b1";
const RED_HEX = "#d8413a";

export type TechItem = { name: string; tier: number };

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Flat order: tier0[0]=.NET, tier0[1]=OracleAPEX, tier1[0]=OracleDB,
//             tier2[0]=Bitdefender, tier2[1]=ISO27001, tier2[2]=ISO9001
// Oracle DB left, .NET upper-right, APEX lower-right, security spread lower.
const NODE_POS: [number, number, number][] = [
  [ 1.8,  1.2,  0.2],  // .NET         upper-right
  [ 1.4, -0.5, -0.3],  // Oracle APEX  mid-right
  [-2.0,  0.1,  0.3],  // Oracle DB    left
  [-1.5, -1.7,  0.1],  // Bitdefender  lower-left
  [ 0.3, -1.9, -0.2],  // ISO 27001    lower-center
  [ 2.2, -1.5,  0.3],  // ISO 9001     lower-right
];

// [fromIdx, toIdx, isAudit]
const EDGES: [number, number, boolean][] = [
  [0, 2, false],  // .NET → Oracle DB
  [1, 2, false],  // Oracle APEX → Oracle DB
  [0, 1, false],  // .NET ↔ Oracle APEX
  [2, 3, true],   // Oracle DB → Bitdefender (audit)
  [2, 4, true],   // Oracle DB → ISO 27001 (audit)
  [0, 4, true],   // .NET → ISO 27001 (audit)
  [1, 5, true],   // Oracle APEX → ISO 9001 (audit)
];

const BUILD_DELAY = 0.4;   // seconds before first arc starts
const BUILD_RAMP  = 0.55;  // seconds per arc to reach full
const BUILD_GAP   = 0.28;  // stagger between arc starts

// ─── Particle arc — builds itself then flows ─────────────────────────────────
function ArcFlow({
  from,
  to,
  isAudit,
  arcIdx,
  mountTime,
  isLitRef,
  seed,
  particleCount = 24,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  isAudit: boolean;
  arcIdx: number;
  mountTime: React.MutableRefObject<number | null>;
  isLitRef: React.MutableRefObject<boolean>;
  seed: number;
  particleCount?: number;
}) {
  const ref = useRef<THREE.Points>(null);

  // Imperative material — never touched by React reconciler so opacity persists.
  const mat = useMemo(() => {
    const m = new THREE.PointsMaterial({
      color: isAudit ? RED : TEAL,
      size: 0.072,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return m;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const curve = useMemo(() => {
    const rng = makeRng(seed);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from).normalize();
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(up)) > 0.95) up.set(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize();
    perp.applyAxisAngle(dir, rng() * Math.PI * 2);
    const dist = from.distanceTo(to);
    mid.addScaledVector(perp, dist * 0.3 + 0.12);
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to, seed]);

  const data = useMemo(() => {
    const rng = makeRng(seed + 1);
    const positions = new Float32Array(particleCount * 3);
    const offsets = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) offsets[i] = i / particleCount;
    const speed = 0.17 + rng() * 0.07;
    return { positions, offsets, speed };
  }, [particleCount, seed]);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mountTime.current === null) return;
    const elapsed = t - mountTime.current;
    const arcStart = BUILD_DELAY + arcIdx * BUILD_GAP;
    const bp = Math.max(0, Math.min(1, (elapsed - arcStart) / BUILD_RAMP));

    mat.opacity = bp > 0 ? (isLitRef.current ? 0.85 : 0.1) : 0;
    if (bp <= 0) return;

    for (let i = 0; i < particleCount; i++) {
      // Build phase: particles race from origin to bp along the curve.
      // Flow phase: continuous loop.
      const u = bp < 1
        ? data.offsets[i] * bp
        : (t * data.speed + data.offsets[i]) % 1;
      curve.getPoint(u, tmp);
      data.positions[i * 3    ] = tmp.x;
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
      <primitive object={mat} attach="material" />
    </points>
  );
}

// ─── Node: wireframe icosahedron + glowing core + label ──────────────────────
function NodeOrb({
  position,
  isSecurity,
  dimmed,
  isHovered,
  name,
  onEnter,
  onLeave,
}: {
  position: THREE.Vector3;
  isSecurity: boolean;
  dimmed: boolean;
  isHovered: boolean;
  name: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const wireRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const colorObj = isSecurity ? RED : TEAL;
  const colorHex = isSecurity ? RED_HEX : TEAL_HEX;

  useFrame((state, delta) => {
    if (wireRef.current) {
      wireRef.current.rotation.y += delta * 0.42;
      wireRef.current.rotation.x -= delta * 0.22;
    }
    if (coreRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.1;
      coreRef.current.scale.setScalar(s * (isHovered ? 1.35 : 1));
    }
  });

  const labelOpacity = isHovered ? 1 : dimmed ? 0.2 : 0.9;

  return (
    <group position={position}>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.31, 1]} />
        <meshBasicMaterial
          color={colorObj}
          wireframe
          transparent
          opacity={dimmed ? 0.18 : isHovered ? 0.82 : 0.52}
        />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.095, 14, 14]} />
        <meshBasicMaterial color={colorObj} transparent opacity={dimmed ? 0.28 : 0.95} />
      </mesh>
      {isHovered && (
        <mesh>
          <sphereGeometry args={[0.45, 18, 18]} />
          <meshBasicMaterial
            color={colorObj}
            transparent
            opacity={0.13}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      <Html center distanceFactor={6} style={{ pointerEvents: "auto", userSelect: "none" }}>
        <div
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          className="whitespace-nowrap mono uppercase tracking-[0.18em] text-[11px] px-2 py-1 cursor-pointer flex items-center gap-1.5"
          style={{
            color: colorHex,
            opacity: labelOpacity,
            textShadow: isHovered ? `0 0 12px ${colorHex}` : "none",
            transform: `translate(0, -28px) scale(${isHovered ? 1.28 : 1})`,
            transition: "opacity 180ms, transform 180ms",
          }}
        >
          <span
            className="inline-block h-1 w-1 rounded-full"
            style={{
              background: colorHex,
              boxShadow: isHovered ? `0 0 6px ${colorHex}` : "none",
            }}
          />
          {name}
        </div>
      </Html>
    </group>
  );
}

// Sparse ambient cloud for depth
function Ambient() {
  const positions = useMemo(() => {
    const rng = makeRng(0xf00d);
    const arr = new Float32Array(160 * 3);
    for (let i = 0; i < 160; i++) {
      arr[i * 3    ] = (rng() - 0.5) * 12;
      arr[i * 3 + 1] = (rng() - 0.5) * 7;
      arr[i * 3 + 2] = (rng() - 0.5) * 7 - 2;
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
        size={0.022}
        transparent
        opacity={0.28}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({ items }: { items: TechItem[] }) {
  const group = useRef<THREE.Group>(null);
  const mountTime = useRef<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const maxTier = useMemo(() => Math.max(...items.map((i) => i.tier)), [items]);

  const positions = useMemo(
    () => NODE_POS.slice(0, items.length).map((p) => new THREE.Vector3(...p)),
    [items]
  );

  // Adjacency: which nodes are connected to a given hovered node
  const connectedSet = useMemo<Set<number>>(() => {
    if (hovered === null) return new Set();
    const s = new Set<number>();
    EDGES.forEach(([a, b]) => {
      if (a === hovered) s.add(b);
      if (b === hovered) s.add(a);
    });
    return s;
  }, [hovered]);

  // Per-arc isLit refs — updated each render, read each frame by ArcFlow
  const arcLitRefs = useMemo(
    () => EDGES.map(() => ({ current: true } as React.MutableRefObject<boolean>)),
    []
  );
  // Sync isLit each render
  EDGES.forEach(([ai, bi], idx) => {
    arcLitRefs[idx].current =
      hovered === null || hovered === ai || hovered === bi;
  });

  useFrame((state, delta) => {
    if (mountTime.current === null) mountTime.current = state.clock.elapsedTime;
    if (!group.current) return;
    const speed = hovered !== null ? 0.02 : 0.09;
    group.current.rotation.y += delta * speed;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.14) * 0.05;
  });

  return (
    <>
      <Ambient />
      <group ref={group}>
        {items.map((item, i) => {
          const pos = positions[i];
          if (!pos) return null;
          const isSec = item.tier === maxTier;
          const isHov = hovered === i;
          const dimmed = hovered !== null && !isHov && !connectedSet.has(i);
          return (
            <NodeOrb
              key={i}
              position={pos}
              isSecurity={isSec}
              dimmed={dimmed}
              isHovered={isHov}
              name={item.name}
              onEnter={() => setHovered(i)}
              onLeave={() => setHovered((h) => (h === i ? null : h))}
            />
          );
        })}
        {EDGES.map(([ai, bi, isAudit], idx) => {
          const a = positions[ai];
          const b = positions[bi];
          if (!a || !b) return null;
          return (
            <ArcFlow
              key={idx}
              from={a}
              to={b}
              isAudit={isAudit}
              arcIdx={idx}
              mountTime={mountTime}
              isLitRef={arcLitRefs[idx]}
              seed={0x400 + idx * 1013}
            />
          );
        })}
      </group>
    </>
  );
}

export default function TechFlow({ items }: { items: TechItem[] }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7.2], fov: 48 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <Scene items={items} />
      </Suspense>
    </Canvas>
  );
}
