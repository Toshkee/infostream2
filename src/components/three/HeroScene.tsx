"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const TEAL = new THREE.Color("#48b8b1");
const RED = new THREE.Color("#d8413a");

// Four process nodes laid out along a meandering 3D path.
// Node i lights up when phase ≈ i+1 (phase 1..4 are the four process scenes).
const NODES: THREE.Vector3[] = [
  new THREE.Vector3(-10, 1.2, -2),  // 0 — discover
  new THREE.Vector3(-3.2, -1.4, 2.5), // 1 — design
  new THREE.Vector3(3.4, 1.6, -1.5),  // 2 — build
  new THREE.Vector3(10, -0.6, 2.8),   // 3 — run
];

const CURVE = new THREE.CatmullRomCurve3(NODES, false, "catmullrom", 0.4);

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function activationFor(phase: number, index: number): number {
  // Smooth bell around phase = index + 1; ~0 when more than 0.7 phases away.
  const d = Math.abs(phase - (index + 1));
  const half = 0.7;
  if (d >= half) return 0;
  const t = 1 - d / half;
  return t * t * (3 - 2 * t);
}

function AmbientCloud({ count = 1100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const rand = makeRng(0xa3f1);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Wide, shallow cloud — feels like dust around the pipeline rather than a sphere
      positions[i * 3 + 0] = (rand() - 0.5) * 38;
      positions[i * 3 + 1] = (rand() - 0.5) * 14;
      positions[i * 3 + 2] = (rand() - 0.5) * 18;
      const c = rand() < 0.08 ? RED : TEAL;
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += delta * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function PipelineTube() {
  const geo = useMemo(
    () => new THREE.TubeGeometry(CURVE, 240, 0.035, 8, false),
    []
  );
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial
        color={TEAL}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function FlowingPackets({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, offsets } = useMemo(() => {
    const rng = makeRng(0xbeef);
    const positions = new Float32Array(count * 3);
    const offsets = new Float32Array(count);
    for (let i = 0; i < count; i++) offsets[i] = rng();
    return { positions, offsets };
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const u = (t * 0.05 + offsets[i]) % 1;
      CURVE.getPointAt(u, p);
      positions[i * 3 + 0] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    if (ref.current) {
      const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={TEAL}
        size={0.14}
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function NodeMesh({
  index,
  phase,
  position,
}: {
  index: number;
  phase: number;
  position: THREE.Vector3;
}) {
  const group = useRef<THREE.Group>(null);
  const wireMat = useRef<THREE.MeshBasicMaterial>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const a = activationFor(phase, index);
    g.rotation.y += delta * (0.18 + a * 0.5);
    g.rotation.x += delta * 0.08;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4 + index) * 0.04 * a;
    const s = (0.9 + a * 0.55) * pulse;
    g.scale.setScalar(s);
    if (wireMat.current) wireMat.current.opacity = 0.22 + a * 0.55;
    if (coreMat.current) coreMat.current.opacity = 0.25 + a * 0.7;
    if (ringMat.current) ringMat.current.opacity = a * 0.65;
  });

  return (
    <group ref={group} position={position}>
      <mesh>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshBasicMaterial ref={wireMat} color={TEAL} wireframe transparent />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.28, 18, 18]} />
        <meshBasicMaterial ref={coreMat} color={TEAL} transparent />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <ringGeometry args={[1.25, 1.32, 48]} />
        <meshBasicMaterial
          ref={ringMat}
          color={TEAL}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CameraRig({ phase }: { phase: number }) {
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const cam = state.camera;
    const t = state.clock.elapsedTime;

    // Wide overview during the intro scene (phase 0); transitions to node-tracking by phase 1.
    const intro = Math.max(0, 1 - phase / 1);

    // Active node interpolation (phase 1..4 → segments 0..3)
    const stage = Math.max(0, Math.min(3, phase - 1));
    const lo = Math.floor(stage);
    const hi = Math.min(3, lo + 1);
    const f = stage - lo;
    const fs = f * f * (3 - 2 * f);
    tmp.copy(NODES[lo]).lerp(NODES[hi], fs);

    // Camera offset: shifted left so the node sits on the right ~65% of the frame
    // (text column lives on the left half of the hero).
    const closeOffset = new THREE.Vector3(-3.2, 1.2, 5.5);
    const wideOffset = new THREE.Vector3(Math.sin(t * 0.05) * 1.5, 1.8, 18);

    desired
      .copy(tmp)
      .add(closeOffset)
      .lerp(wideOffset, intro);

    lookAt.copy(tmp).lerp(new THREE.Vector3(0, 0, 0), intro);

    // Damped follow so scroll feels smooth even with React state updates.
    const damp = 1 - Math.pow(0.001, delta);
    cam.position.lerp(desired, damp);
    cam.lookAt(lookAt);
  });
  return null;
}

export default function HeroScene({ phase }: { phase: number }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.8, 18], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig phase={phase} />
      <AmbientCloud />
      <PipelineTube />
      <FlowingPackets />
      {NODES.map((pos, i) => (
        <NodeMesh key={i} index={i} phase={phase} position={pos} />
      ))}
    </Canvas>
  );
}
