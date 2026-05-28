"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const TEAL = new THREE.Color("#48b8b1");
const RED_HEX = "#d8413a";
const TEAL_HEX = "#48b8b1";

export type TechItem = { name: string; tier: number };

// ─── Positions ─────────────────────────────────────────────────────────────
// Group labels into latitude bands by tier instead of scattering randomly.
// Visually reinforces the stack: top hemisphere = app, equator = data,
// bottom hemisphere = security. Last tier always lands at the south band.
function tierGroupedPositions(items: TechItem[], radius: number): THREE.Vector3[] {
  const tierList = [...new Set(items.map((i) => i.tier))].sort((a, b) => a - b);
  const totalTiers = tierList.length;

  const byTier = new Map<number, TechItem[]>();
  items.forEach((item) => {
    if (!byTier.has(item.tier)) byTier.set(item.tier, []);
    byTier.get(item.tier)!.push(item);
  });

  return items.map((item) => {
    const peers = byTier.get(item.tier)!;
    const idxInTier = peers.indexOf(item);
    const totalInTier = peers.length;
    const tierPos = tierList.indexOf(item.tier); // 0..N-1, top to bottom

    // Lat band: tier 0 (top) → +0.65, last tier (bottom) → -0.65
    const lat =
      totalTiers === 1 ? 0 : 0.65 - (tierPos / (totalTiers - 1)) * 1.3;

    // Spread longitude evenly within tier, with a tier-dependent offset so
    // adjacent tiers don't stack their first labels at the same azimuth.
    const lng =
      totalInTier === 1
        ? tierPos * 0.6
        : (idxInTier / totalInTier) * Math.PI * 2 + tierPos * 0.55;

    const cosLat = Math.sqrt(Math.max(0, 1 - lat * lat));
    return new THREE.Vector3(
      cosLat * Math.cos(lng) * radius,
      lat * radius,
      cosLat * Math.sin(lng) * radius
    );
  });
}

function CoreOrb() {
  const wire = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (wire.current) {
      wire.current.rotation.y += delta * 0.4;
      wire.current.rotation.x -= delta * 0.2;
      const s = 0.85 + Math.sin(state.clock.elapsedTime * 1.4) * 0.06;
      wire.current.scale.setScalar(s);
    }
    if (inner.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      inner.current.scale.setScalar(s);
    }
  });
  return (
    <group>
      <mesh ref={wire}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshBasicMaterial color={TEAL} wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={inner}>
        <sphereGeometry args={[0.18, 18, 18]} />
        <meshBasicMaterial color={TEAL} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

// Faint latitude rings — one per tier — anchoring the labels visually.
function TierGuideRing({
  lat,
  radius,
  color,
}: {
  lat: number;
  radius: number;
  color: string;
}) {
  const points = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    const r = radius * Math.sqrt(Math.max(0, 1 - lat * lat));
    const y = lat * radius;
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    return pts;
  }, [lat, radius]);
  return <Line points={points} color={color} lineWidth={1} transparent opacity={0.18} />;
}

function PulseRings({ count = 3 }: { count?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const phase = (t * 0.25 + i / count) % 1;
      const r = 0.4 + phase * 2.6;
      const mesh = refs.current[i];
      const mat = mats.current[i];
      if (mesh) mesh.scale.setScalar(r);
      if (mat) mat.opacity = (1 - phase) * 0.35;
    }
  });

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <ringGeometry args={[0.95, 1.0, 64]} />
          <meshBasicMaterial
            ref={(el) => {
              mats.current[i] = el;
            }}
            color={TEAL}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function TechLabel({
  item,
  position,
  index,
  isSecurity,
  hoveredIndex,
  onEnter,
  onLeave,
}: {
  item: TechItem;
  position: THREE.Vector3;
  index: number;
  isSecurity: boolean;
  hoveredIndex: number | null;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const direction = useMemo(() => position.clone().normalize(), [position]);
  const restPos = useMemo(() => position.clone(), [position]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const phaseOffset = useMemo(() => index * 0.6, [index]);

  const hovered = hoveredIndex === index;
  const anyHovered = hoveredIndex !== null;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const breath = Math.sin(state.clock.elapsedTime * 0.9 + phaseOffset) * 0.08;
    const pull = hovered ? 0.7 : breath;
    tmp.copy(restPos).addScaledVector(direction, pull);
    g.position.lerp(tmp, Math.min(1, delta * 8));
  });

  const color = isSecurity ? RED_HEX : TEAL_HEX;
  const opacity = hovered ? 1 : anyHovered ? 0.22 : 0.92;

  return (
    <group ref={group} position={position}>
      <Html
        center
        distanceFactor={6}
        style={{
          pointerEvents: "auto",
          userSelect: "none",
          opacity,
          transition: "opacity 200ms, transform 200ms",
          transform: hovered ? "scale(1.35)" : "scale(1)",
        }}
      >
        <div
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          className="whitespace-nowrap mono uppercase tracking-[0.18em] text-[11px] px-2 py-1 cursor-pointer flex items-center gap-1.5"
          style={{
            color,
            textShadow: hovered ? `0 0 12px ${color}` : "none",
          }}
        >
          <span
            className="inline-block h-1 w-1 rounded-full"
            style={{
              background: color,
              boxShadow: hovered ? `0 0 6px ${color}` : "none",
            }}
          />
          {item.name}
        </div>
      </Html>
    </group>
  );
}

function HoverLine({ from, color }: { from: THREE.Vector3; color: string }) {
  const points = useMemo<[number, number, number][]>(
    () => [[0, 0, 0], [from.x, from.y, from.z]],
    [from]
  );
  return <Line points={points} color={color} lineWidth={1.2} transparent opacity={0.7} />;
}

function Cluster({ items }: { items: TechItem[] }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const radius = 2.4;
  const positions = useMemo(
    () => tierGroupedPositions(items, radius),
    [items]
  );

  // Resolve per-item security flag and tier-latitude list for guide rings.
  const tierList = useMemo(
    () => [...new Set(items.map((i) => i.tier))].sort((a, b) => a - b),
    [items]
  );
  const totalTiers = tierList.length;
  const tierLats = useMemo(
    () =>
      tierList.map((_, idx) =>
        totalTiers === 1 ? 0 : 0.65 - (idx / (totalTiers - 1)) * 1.3
      ),
    [tierList, totalTiers]
  );
  const securityTier = tierList[tierList.length - 1];

  useFrame((state, delta) => {
    if (!group.current) return;
    const speed = hovered === null ? 0.12 : 0.02;
    group.current.rotation.y += delta * speed;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.06;
  });

  const hoverColor =
    hovered !== null && items[hovered].tier === securityTier
      ? RED_HEX
      : "#7fd5cf";

  return (
    <group ref={group}>
      <CoreOrb />
      <PulseRings />
      {tierLats.map((lat, ti) => (
        <TierGuideRing
          key={`ring-${ti}`}
          lat={lat}
          radius={radius}
          color={tierList[ti] === securityTier ? RED_HEX : TEAL_HEX}
        />
      ))}
      {hovered !== null && <HoverLine from={positions[hovered]} color={hoverColor} />}
      {items.map((item, i) => (
        <TechLabel
          key={`${item.name}-${i}`}
          item={item}
          index={i}
          position={positions[i]}
          isSecurity={item.tier === securityTier}
          hoveredIndex={hovered}
          onEnter={() => setHovered(i)}
          onLeave={() => setHovered((h) => (h === i ? null : h))}
        />
      ))}
    </group>
  );
}

export default function TechCluster({ items }: { items: TechItem[] }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <Cluster items={items} />
      </Suspense>
    </Canvas>
  );
}
