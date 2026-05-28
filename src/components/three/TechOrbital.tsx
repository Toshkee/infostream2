"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const TEAL = new THREE.Color("#48b8b1");
const RED = new THREE.Color("#d8413a");

// One ring per tier — y level, radius, and rotation speed (sign = direction).
const RING_Y = [1.0, 0, -1.0];
const RING_R = [2.4, 1.7, 2.9];
const RING_SPEED = [0.14, -0.10, 0.07];

export type TierData = { label: string; tech: string[] };

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function CoreOrb() {
  const wire = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (wire.current) {
      wire.current.rotation.y += delta * 0.45;
      wire.current.rotation.x -= delta * 0.25;
      wire.current.scale.setScalar(0.9 + Math.sin(state.clock.elapsedTime * 1.5) * 0.06);
    }
    if (inner.current) {
      inner.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.12);
    }
  });
  return (
    <group>
      <mesh ref={wire}>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshBasicMaterial color={TEAL} wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={inner}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color={TEAL} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

// Faint guide circle at each tier's radius — static, doesn't rotate with the ring particles.
function RingGuide({
  y,
  radius,
  color,
  highlighted,
}: {
  y: number;
  radius: number;
  color: THREE.Color;
  highlighted: boolean;
}) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const N = 128;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  return (
    <group position={[0, y, 0]}>
      <line>
        <primitive object={geo} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={highlighted ? 0.55 : 0.22} />
      </line>
    </group>
  );
}

// ~240 particles in a thin band around the ring. Positions are static — the
// parent group's rotation carries them around.
function RingParticles({
  radius,
  color,
  seed,
  count = 240,
}: {
  radius: number;
  color: THREE.Color;
  seed: number;
  count?: number;
}) {
  const positions = useMemo(() => {
    const rng = makeRng(seed);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = radius + (rng() - 0.5) * 0.32;
      arr[i * 3 + 0] = Math.cos(a) * r;
      arr[i * 3 + 1] = (rng() - 0.5) * 0.28;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [radius, seed, count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.05}
        transparent
        opacity={0.88}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Central column of particles drifting up through the rings — reads as data
// flowing up the stack.
function VerticalStream({ count = 100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const rng = makeRng(0xdead);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = rng() * 0.22;
      const a = rng() * Math.PI * 2;
      arr[i * 3 + 0] = Math.cos(a) * r;
      arr[i * 3 + 1] = -1.5 + rng() * 3;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += delta * 0.42;
      if (positions[i * 3 + 1] > 1.6) positions[i * 3 + 1] = -1.6;
    }
    if (ref.current) {
      (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={TEAL}
        size={0.038}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Stationary tier badge — sits at the centerline of each ring, doesn't rotate.
function TierBadge({
  name,
  y,
  isSecurity,
  dim,
}: {
  name: string;
  y: number;
  isSecurity: boolean;
  dim: boolean;
}) {
  const color = isSecurity ? "rgba(216,65,58,0.85)" : "rgba(255,255,255,0.5)";
  return (
    <Html
      position={[0, y, 0]}
      center
      distanceFactor={7}
      style={{ pointerEvents: "none", opacity: dim ? 0.4 : 1, transition: "opacity 200ms" }}
    >
      <div
        className="whitespace-nowrap mono uppercase tracking-[0.32em] text-[9px]"
        style={{ color }}
      >
        ─ {name} ─
      </div>
    </Html>
  );
}

function TechLabel({
  name,
  position,
  colorHex,
  hovered,
  anyHovered,
  onEnter,
  onLeave,
}: {
  name: string;
  position: THREE.Vector3;
  colorHex: string;
  hovered: boolean;
  anyHovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const opacity = hovered ? 1 : anyHovered ? 0.2 : 0.92;
  return (
    <Html
      position={[position.x, position.y, position.z]}
      center
      distanceFactor={5}
      style={{
        pointerEvents: "auto",
        userSelect: "none",
        opacity,
        transition: "opacity 200ms, transform 200ms",
        transform: hovered ? "scale(1.4)" : "scale(1)",
      }}
    >
      <div
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="whitespace-nowrap mono uppercase tracking-[0.18em] text-[11px] px-2 py-1 cursor-pointer flex items-center gap-1.5"
        style={{
          color: colorHex,
          textShadow: hovered ? `0 0 12px ${colorHex}` : "none",
        }}
      >
        <span
          className="inline-block h-1 w-1 rounded-full"
          style={{
            background: colorHex,
            boxShadow: hovered ? `0 0 6px ${colorHex}` : "none",
          }}
        />
        {name}
      </div>
    </Html>
  );
}

function RotatingRing({
  tierIndex,
  tier,
  isSecurity,
  hovered,
  setHovered,
}: {
  tierIndex: number;
  tier: TierData;
  isSecurity: boolean;
  hovered: string | null;
  setHovered: (h: string | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const y = RING_Y[tierIndex];
  const r = RING_R[tierIndex];
  const color = isSecurity ? RED : TEAL;
  const colorHex = isSecurity ? "#d8413a" : "#48b8b1";

  useFrame((_, delta) => {
    if (!group.current) return;
    // Pause rotation while any label in this ring is hovered so it stays readable.
    const tierKeyPrefix = `${tierIndex}-`;
    const paused = hovered !== null && hovered.startsWith(tierKeyPrefix);
    if (!paused) group.current.rotation.y += delta * RING_SPEED[tierIndex];
  });

  return (
    <group ref={group} position={[0, y, 0]}>
      <RingParticles radius={r} color={color} seed={0x9000 + tierIndex * 137} />
      {tier.tech.map((name, idx) => {
        // Spread labels evenly; offset by tier so adjacent tiers' labels rarely overlap on screen.
        const angle =
          (idx / tier.tech.length) * Math.PI * 2 + tierIndex * 0.85;
        const pos = new THREE.Vector3(
          Math.cos(angle) * r,
          0,
          Math.sin(angle) * r
        );
        const key = `${tierIndex}-${idx}`;
        return (
          <TechLabel
            key={key}
            name={name}
            position={pos}
            colorHex={colorHex}
            hovered={hovered === key}
            anyHovered={hovered !== null}
            onEnter={() => setHovered(key)}
            onLeave={() => setHovered(hovered === key ? null : hovered)}
          />
        );
      })}
    </group>
  );
}

function CameraDrift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.08) * 0.6;
    state.camera.position.y = 1.7 + Math.cos(t * 0.06) * 0.18;
    state.camera.position.z = 6.6;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ tiers }: { tiers: TierData[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <>
      <CameraDrift />
      <CoreOrb />
      <VerticalStream />
      {tiers.map((tier, ti) => {
        const isSec = ti === tiers.length - 1;
        const color = isSec ? RED : TEAL;
        const tierKeyPrefix = `${ti}-`;
        const isThisTierHovered =
          hovered !== null && hovered.startsWith(tierKeyPrefix);
        const dimBadge =
          hovered !== null && !isThisTierHovered;
        return (
          <group key={ti}>
            <RingGuide
              y={RING_Y[ti]}
              radius={RING_R[ti]}
              color={color}
              highlighted={isThisTierHovered}
            />
            <TierBadge
              name={tier.label.toUpperCase()}
              y={RING_Y[ti]}
              isSecurity={isSec}
              dim={dimBadge}
            />
            <RotatingRing
              tierIndex={ti}
              tier={tier}
              isSecurity={isSec}
              hovered={hovered}
              setHovered={setHovered}
            />
          </group>
        );
      })}
    </>
  );
}

export default function TechOrbital({ tiers }: { tiers: TierData[] }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.7, 6.6], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <Scene tiers={tiers} />
      </Suspense>
    </Canvas>
  );
}
