"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// Continuous phase 0..5 (intro, stage1..4, exit)
export type SceneState = { phase: number };

// Four stacked architectural layers (Y positions, top → bottom)
const LAYERS: { y: number; label: string }[] = [
  { y:  1.8, label: "DISCOVERY" },
  { y:  0.6, label: "ARCHITECTURE" },
  { y: -0.6, label: "BUILD" },
  { y: -1.8, label: "OPERATE" },
];

const LAYER_W = 4.2;
const LAYER_D = 2.6;

// Per-phase camera target + offset (where to look + where to sit relative to it)
const PHASE_TARGETS: [number, number, number][] = [
  [0, 0, 0],
  [0,  1.8, 0],
  [0,  0.6, 0],
  [0, -0.6, 0],
  [0, -1.8, 0],
  [0, 0, 0],
];
const PHASE_CAM_OFFSETS: [number, number, number][] = [
  [3.2,  0.0, 6.2],   // intro — overview
  [3.0,  0.5, 3.6],   // layer 1
  [3.0,  0.4, 3.4],   // layer 2
  [3.0,  0.4, 3.4],   // layer 3
  [3.0,  0.5, 3.6],   // layer 4
  [4.5,  2.4, 9.0],   // exit — pulled back, elevated
];

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function lerpVec(out: THREE.Vector3, a: [number, number, number], b: [number, number, number], t: number) {
  out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

// Build a wireframe rectangle (4 edges) as a single BufferGeometry
function rectFrame(w: number, d: number): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2;
  const pts = [
    new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3( hw, 0, -hd),
    new THREE.Vector3( hw, 0, -hd), new THREE.Vector3( hw, 0,  hd),
    new THREE.Vector3( hw, 0,  hd), new THREE.Vector3(-hw, 0,  hd),
    new THREE.Vector3(-hw, 0,  hd), new THREE.Vector3(-hw, 0, -hd),
  ];
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// Inner grid lines on a layer panel
function innerGrid(w: number, d: number, divX: number, divZ: number): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2;
  const pts: THREE.Vector3[] = [];
  for (let i = 1; i < divX; i++) {
    const x = -hw + (w * i) / divX;
    pts.push(new THREE.Vector3(x, 0, -hd), new THREE.Vector3(x, 0, hd));
  }
  for (let j = 1; j < divZ; j++) {
    const z = -hd + (d * j) / divZ;
    pts.push(new THREE.Vector3(-hw, 0, z), new THREE.Vector3(hw, 0, z));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// Vertical "columns" between layer corners
function columnLines(): THREE.BufferGeometry {
  const hw = LAYER_W / 2, hd = LAYER_D / 2;
  const corners: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  const yTop = LAYERS[0].y;
  const yBot = LAYERS[LAYERS.length - 1].y;
  const pts: THREE.Vector3[] = [];
  for (const [x, z] of corners) {
    pts.push(new THREE.Vector3(x, yTop, z), new THREE.Vector3(x, yBot, z));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function World({ stateRef }: { stateRef: React.MutableRefObject<SceneState> }) {
  const group = useRef<THREE.Group>(null!);
  const panelRefs = useRef<(THREE.Mesh | null)[]>([]);
  const frameRefs = useRef<(THREE.LineSegments | null)[]>([]);
  const gridRefs = useRef<(THREE.LineSegments | null)[]>([]);
  const motes = useRef<THREE.InstancedMesh>(null!);
  const { camera } = useThree();

  const frameGeo = useMemo(() => rectFrame(LAYER_W, LAYER_D), []);
  const gridGeo = useMemo(() => innerGrid(LAYER_W, LAYER_D, 12, 8), []);
  const columnGeo = useMemo(() => columnLines(), []);

  // Floating motes (small cubes drifting through the volume)
  const MOTE_COUNT = 80;
  const moteData = useMemo(() => {
    const arr: { x: number; z: number; y0: number; speed: number; rand: number }[] = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
      arr.push({
        x: (Math.random() - 0.5) * LAYER_W * 0.95,
        z: (Math.random() - 0.5) * LAYER_D * 0.95,
        y0: -2.2 + Math.random() * 4.4,
        speed: 0.08 + Math.random() * 0.12,
        rand: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const tmpTarget = useMemo(() => new THREE.Vector3(), []);
  const tmpOffset = useMemo(() => new THREE.Vector3(), []);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  const phaseToLayer = [-1, 0, 1, 2, 3, -1];

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const phase = Math.max(0, stateRef.current.phase);
    const lo = Math.max(0, Math.min(5, Math.floor(phase)));
    const hi = Math.min(5, lo + 1);
    const fLin = phase - lo;
    const f = smoothstep(fLin);
    const activeLayer = phaseToLayer[Math.round(phase)] ?? -1;

    // Group: slow ambient yaw + dive tilt during stage transitions (dives between layers)
    const introExitSway = lo === 0 || lo === 5 ? Math.sin(t * 0.15) * 0.05 : 0;
    // Between-stage dive tilt: arcs up during 1→2, 2→3, 3→4 transitions
    const betweenStages = lo >= 1 && lo < 4 ? Math.sin(fLin * Math.PI) : 0;
    group.current.rotation.y = Math.sin(t * 0.08) * 0.06 + introExitSway;
    group.current.rotation.x = betweenStages * 0.08;

    // Camera — normal phase interp with extra dive arc between stages
    lerpVec(tmpTarget, PHASE_TARGETS[lo], PHASE_TARGETS[hi], f);
    lerpVec(tmpOffset, PHASE_CAM_OFFSETS[lo], PHASE_CAM_OFFSETS[hi], f);
    if (lo >= 1 && lo < 4) {
      const arc = Math.sin(fLin * Math.PI);
      // Pull back + lift between stages so it feels like diving from one layer to the next
      tmpOffset.x += arc * 0.6;
      tmpOffset.z += arc * 1.4;
      tmpOffset.y += arc * 0.5;
    }
    tmpPos.copy(tmpTarget).add(tmpOffset);
    camera.position.x += (tmpPos.x - camera.position.x) * 0.06;
    camera.position.y += (tmpPos.y - camera.position.y) * 0.06;
    camera.position.z += (tmpPos.z - camera.position.z) * 0.06;
    camera.lookAt(tmpLook.copy(tmpTarget));

    // Layer states — active layer glows, others dim
    LAYERS.forEach((layer, i) => {
      const panel = panelRefs.current[i];
      const frame = frameRefs.current[i];
      const grid = gridRefs.current[i];
      if (!panel || !frame || !grid) return;
      const active = i === activeLayer;

      // Panel opacity
      const panelMat = panel.material as THREE.MeshBasicMaterial;
      const targetPanelOp = active ? 0.18 : 0.06;
      panelMat.opacity += (targetPanelOp - panelMat.opacity) * 0.08;

      // Frame brightness — color lerp toward teal when active
      const frameMat = frame.material as THREE.LineBasicMaterial;
      const targetFrameOp = active ? 0.95 : 0.32;
      frameMat.opacity += (targetFrameOp - frameMat.opacity) * 0.08;
      const targetColor = active ? activeFrameColor : idleFrameColor;
      frameMat.color.lerp(targetColor, 0.08);

      // Grid lines on the panel
      const gridMat = grid.material as THREE.LineBasicMaterial;
      const targetGridOp = active ? 0.5 : 0.12;
      gridMat.opacity += (targetGridOp - gridMat.opacity) * 0.08;

      // Slight Y bob on active layer
      const bobTarget = active ? layer.y + Math.sin(t * 1.4) * 0.04 : layer.y;
      panel.position.y += (bobTarget - panel.position.y) * 0.1;
      frame.position.y = panel.position.y;
      grid.position.y = panel.position.y + 0.002;
    });

    // Floating motes — drift upward, wrap when out of bounds, lateral wobble
    for (let i = 0; i < MOTE_COUNT; i++) {
      const m = moteData[i];
      const y = ((m.y0 + t * m.speed + 2.4) % 4.8) - 2.4;
      const wobX = m.x + Math.sin(t * 0.5 + m.rand) * 0.08;
      const wobZ = m.z + Math.cos(t * 0.4 + m.rand) * 0.08;
      dummy.position.set(wobX, y, wobZ);
      const sc = 0.018 + Math.sin(t + m.rand) * 0.006;
      dummy.scale.setScalar(sc);
      dummy.rotation.set(t * 0.3 + m.rand, t * 0.4, 0);
      dummy.updateMatrix();
      motes.current.setMatrixAt(i, dummy.matrix);
    }
    motes.current.instanceMatrix.needsUpdate = true;
  });

  // Static colors (created once)
  const activeFrameColor = useMemo(() => new THREE.Color("#7ad8d2"), []);
  const idleFrameColor = useMemo(() => new THREE.Color("#3a4866"), []);

  return (
    <group ref={group}>
      {/* Vertical column lines connecting layer corners — gives architectural feel */}
      <lineSegments>
        <primitive object={columnGeo} attach="geometry" />
        <lineBasicMaterial color="#26324d" transparent opacity={0.55} />
      </lineSegments>

      {LAYERS.map((layer, i) => (
        <group key={i}>
          {/* Translucent panel */}
          <mesh
            ref={(el) => { panelRefs.current[i] = el; }}
            position={[0, layer.y, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[LAYER_W, LAYER_D]} />
            <meshBasicMaterial
              color="#1a2540"
              transparent
              opacity={0.08}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Inner grid on the panel */}
          <lineSegments
            ref={(el) => { gridRefs.current[i] = el; }}
            position={[0, layer.y + 0.002, 0]}
          >
            <primitive object={gridGeo} attach="geometry" />
            <lineBasicMaterial color="#2c3a5a" transparent opacity={0.15} />
          </lineSegments>

          {/* Outer frame */}
          <lineSegments
            ref={(el) => { frameRefs.current[i] = el; }}
            position={[0, layer.y, 0]}
          >
            <primitive object={frameGeo} attach="geometry" />
            <lineBasicMaterial color="#3a4866" transparent opacity={0.4} />
          </lineSegments>
        </group>
      ))}

      {/* Floating motes between layers */}
      <instancedMesh ref={motes} args={[undefined, undefined, MOTE_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#48b8b1" toneMapped={false} transparent opacity={0.7} />
      </instancedMesh>
    </group>
  );
}

export default function DataFlowScene({
  stateRef,
}: {
  stateRef: React.MutableRefObject<SceneState>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [3.2, 0.0, 6.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <World stateRef={stateRef} />
    </Canvas>
  );
}
