"use client";

import "./silenceClockDeprecation";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useInView } from "./useInView";

const TEAL = new THREE.Color("#48b8b1");
const TEAL_BRIGHT = new THREE.Color("#7fd5cf");

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Heater-shield perimeter: rounded top + curved sides tapering to a point.
function shieldPerimeter(t: number): THREE.Vector3 {
  const u = ((t % 1) + 1) % 1;
  if (u < 0.5) {
    const a = Math.PI * (1 - u / 0.5);
    return new THREE.Vector3(Math.cos(a) * 1.5, 1.3 + Math.sin(a) * 0.35, 0);
  }
  const v = (u - 0.5) / 0.5;
  if (v < 0.5) {
    const f = v / 0.5;
    const bow = Math.sin(f * Math.PI) * 0.25;
    return new THREE.Vector3(1.5 * (1 - f) + bow, 1.3 * (1 - f) + -1.7 * f, 0);
  }
  const f = (v - 0.5) / 0.5;
  const bow = -Math.sin(f * Math.PI) * 0.25;
  return new THREE.Vector3(0 * (1 - f) + -1.5 * f + bow, -1.7 * (1 - f) + 1.3 * f, 0);
}

// Returns true if point (x,y) is inside the heater-shield silhouette.
function insideShield(x: number, y: number): boolean {
  // Approximate by half-width(y) — derived from the perimeter sampling.
  // Top half (y in [1.3, 1.65]): ellipse cap, width = sqrt(1 - ((y-1.3)/0.35)^2) * 1.5
  if (y > 1.65 || y < -1.7) return false;
  if (y > 1.3) {
    const k = (y - 1.3) / 0.35;
    if (k > 1) return false;
    const w = Math.sqrt(1 - k * k) * 1.5;
    return Math.abs(x) <= w;
  }
  // Below the cap, the sides curve from 1.5 (at y=1.3) to 0 (at y=-1.7), bowed outward.
  const f = (1.3 - y) / 3; // 0..1 from shoulder to tip
  const fc = Math.max(0, Math.min(1, f));
  const w = 1.5 * (1 - fc) + Math.sin(fc * Math.PI) * 0.25;
  return Math.abs(x) <= w;
}

function ShieldOutline() {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const N = 240;
    for (let i = 0; i <= N; i++) pts.push(shieldPerimeter(i / N));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color={TEAL} transparent opacity={0.3} />
    </line>
  );
}

// Two counter-rotating dashed rings around the shield — heraldic + scanner feel.
function OrbitRings() {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);

  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      arr.push([Math.cos(t) * 2.4, Math.sin(t) * 2.4, 0]);
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (a.current) a.current.rotation.z += delta * 0.08;
    if (b.current) b.current.rotation.z -= delta * 0.05;
  });

  return (
    <>
      <group ref={a}>
        <Line
          points={points}
          color="#48b8b1"
          lineWidth={1}
          dashed
          dashSize={0.16}
          gapSize={0.18}
          transparent
          opacity={0.5}
        />
      </group>
      <group ref={b} scale={[1.08, 1.08, 1]}>
        <Line
          points={points}
          color="#48b8b1"
          lineWidth={0.5}
          dashed
          dashSize={0.06}
          gapSize={0.22}
          transparent
          opacity={0.3}
        />
      </group>
    </>
  );
}

// Hex grid inside the shield — cells light up progressively as build advances.
function HexInterior({ progress }: { progress: number }) {
  const refs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const cells = useMemo(() => {
    // Hex tiling: rows of points with offset on alternating rows.
    const out: { x: number; y: number; t: number }[] = [];
    const rng = makeRng(0xbeef);
    const size = 0.16;
    const xStep = size * Math.sqrt(3);
    const yStep = size * 1.5;
    for (let row = -10; row <= 10; row++) {
      for (let col = -10; col <= 10; col++) {
        const x = col * xStep + (row % 2 === 0 ? 0 : xStep / 2);
        const y = row * yStep;
        if (insideShield(x, y * 1.0)) {
          // Reveal order: bottom (tip) to top. Tip is at y=-1.7, top at y=1.65.
          const t = (y + 1.7) / 3.35; // 0 at tip, ~1 at top
          out.push({ x, y, t: t + (rng() - 0.5) * 0.06 });
        }
      }
    }
    return out;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < cells.length; i++) {
      const mat = refs.current[i];
      if (!mat) continue;
      // Cells reveal as progress crosses their threshold; subtle flicker after.
      const reveal = Math.max(0, Math.min(1, (progress - cells[i].t * 0.7) * 4));
      const flicker = 0.85 + Math.sin(t * 3 + i * 0.7) * 0.15;
      mat.opacity = reveal * 0.18 * flicker;
    }
  });

  return (
    <group>
      {cells.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, -0.02]} rotation={[0, 0, Math.PI / 6]}>
          <circleGeometry args={[0.085, 6]} />
          <meshBasicMaterial
            ref={(el) => {
              refs.current[i] = el;
            }}
            color={TEAL}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Horizontal scanline that sweeps top → bottom synced with progress.
function ScanLine({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!ref.current || !mat.current) return;
    // Sweep across the shield's vertical extent (~1.65 → -1.7)
    const y = 1.65 - progress * 3.35;
    ref.current.position.y = y;
    // Visible while progress is in the "scanning" range; fades on completion.
    const vis = progress > 0.02 && progress < 0.95 ? 1 : Math.max(0, 1 - (progress - 0.95) / 0.05);
    mat.current.opacity = 0.7 * vis;
  });

  return (
    <mesh ref={ref} position={[0, 1.65, 0.02]}>
      <planeGeometry args={[4, 0.06]} />
      <meshBasicMaterial
        ref={mat}
        color={TEAL_BRIGHT}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function AssemblingParticles({
  progress,
  count = 380,
}: {
  progress: number;
  count?: number;
}) {
  const ref = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const rng = makeRng(0x5e1d);
    const targets = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const arrival = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const p = shieldPerimeter(t);
      const jitter = (rng() - 0.5) * 0.06;
      targets[i * 3 + 0] = p.x + jitter;
      targets[i * 3 + 1] = p.y + jitter;
      targets[i * 3 + 2] = p.z + (rng() - 0.5) * 0.3;
      const side = rng() < 0.5 ? -1 : 1;
      starts[i * 3 + 0] = side * (5 + rng() * 4);
      starts[i * 3 + 1] = (rng() - 0.5) * 6;
      starts[i * 3 + 2] = (rng() - 0.5) * 4;
      arrival[i] = 0.15 + rng() * 0.7;
    }
    return { targets, starts, arrival, positions: new Float32Array(count * 3) };
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { targets, starts, arrival, positions } = data;
    for (let i = 0; i < count; i++) {
      const a = arrival[i];
      const local = Math.max(0, Math.min(1, progress / a));
      const eased = local * local * (3 - 2 * local);
      const wobble = local >= 1 ? Math.sin(t * 1.5 + i) * 0.012 : 0;
      positions[i * 3 + 0] = starts[i * 3 + 0] * (1 - eased) + targets[i * 3 + 0] * eased + wobble;
      positions[i * 3 + 1] = starts[i * 3 + 1] * (1 - eased) + targets[i * 3 + 1] * eased + wobble;
      positions[i * 3 + 2] = starts[i * 3 + 2] * (1 - eased) + targets[i * 3 + 2] * eased;
    }
    if (ref.current) {
      const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
      attr.array = positions;
      attr.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={TEAL_BRIGHT}
        size={0.07}
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function IncomingStream({ count = 90 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const rng = makeRng(0xcafe);
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const init = (i: number) => {
      const side = rng() < 0.5 ? -1 : 1;
      positions[i * 3 + 0] = side * (6 + rng() * 3);
      positions[i * 3 + 1] = (rng() - 0.5) * 4;
      positions[i * 3 + 2] = (rng() - 0.5) * 2;
      const tx = (rng() - 0.5) * 1.2;
      const ty = (rng() - 0.5) * 1.2;
      velocity[i * 3 + 0] = (tx - positions[i * 3 + 0]) * 0.012;
      velocity[i * 3 + 1] = (ty - positions[i * 3 + 1]) * 0.012;
      velocity[i * 3 + 2] = -positions[i * 3 + 2] * 0.012;
      life[i] = rng();
    };
    for (let i = 0; i < count; i++) init(i);
    return { positions, velocity, life, init };
  }, [count]);

  useFrame((_, delta) => {
    const { positions, velocity, life, init } = data;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] += velocity[i * 3 + 0];
      positions[i * 3 + 1] += velocity[i * 3 + 1];
      positions[i * 3 + 2] += velocity[i * 3 + 2];
      life[i] += delta * 0.5;
      const dx = positions[i * 3 + 0];
      const dy = positions[i * 3 + 1];
      if (dx * dx + dy * dy < 0.4 || life[i] > 1.4) {
        init(i);
        life[i] = 0;
      }
    }
    if (ref.current) {
      const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={TEAL}
        size={0.04}
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Checkmark({ progress }: { progress: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  const geo = useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.35, 0, 0.05),
      new THREE.Vector3(-0.05, -0.3, 0.05),
      new THREE.Vector3(-0.05, -0.3, 0.05),
      new THREE.Vector3(0.4, 0.25, 0.05),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame((state) => {
    const reveal = Math.max(0, Math.min(1, (progress - 0.82) / 0.15));
    const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 2.4) * 0.3 * reveal;
    if (matRef.current) matRef.current.opacity = reveal * pulse;
    if (ref.current) ref.current.scale.setScalar(0.6 + reveal * 0.6);
  });

  return (
    <lineSegments ref={ref}>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial
        ref={matRef}
        color={TEAL_BRIGHT}
        transparent
        opacity={0}
        linewidth={2}
      />
    </lineSegments>
  );
}

// Small HUD readouts sitting at the corners of the canvas.
function HUDReadouts({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);
  const status = progress < 0.05
    ? "STANDBY"
    : progress < 0.9
    ? "BUILDING"
    : "SECURED";
  return (
    <>
      <Html position={[-2.4, 1.9, 0]} center={false} style={{ pointerEvents: "none" }}>
        <div className="mono uppercase tracking-[0.22em] text-[10px] text-[var(--brand-teal)]/85 whitespace-nowrap">
          ◆ ENCRYPTED · {String(pct).padStart(3, "0")}%
        </div>
      </Html>
      <Html position={[2.4, 1.9, 0]} center={false} style={{ pointerEvents: "none", transform: "translateX(-100%)" }}>
        <div className="mono uppercase tracking-[0.22em] text-[10px] text-[var(--brand-teal)]/85 whitespace-nowrap">
          {status} ◆
        </div>
      </Html>
      <Html position={[-2.4, -2.0, 0]} center={false} style={{ pointerEvents: "none" }}>
        <div className="mono uppercase tracking-[0.22em] text-[10px] text-white/40 whitespace-nowrap">
          ISO-27001 · GDPR · TLS 1.3
        </div>
      </Html>
    </>
  );
}

export default function ShieldScene({ progress }: { progress: number }) {
  const [canvasRef, inView] = useInView<HTMLCanvasElement>();
  return (
    <Canvas
      ref={canvasRef}
      frameloop={inView ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <OrbitRings />
        <ShieldOutline />
        <HexInterior progress={progress} />
        <ScanLine progress={progress} />
        <IncomingStream />
        <AssemblingParticles progress={progress} />
        <Checkmark progress={progress} />
        <HUDReadouts progress={progress} />
      </Suspense>
    </Canvas>
  );
}
