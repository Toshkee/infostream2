"use client";

import "./silenceClockDeprecation";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useInView } from "@/hooks/useInView";
import { seededRng } from "@/lib/rng";

const TEAL = new THREE.Color("#48b8b1");
const RED = new THREE.Color("#d8413a");

// Four process planets laid out along a meandering 3D path.
// Planet i lights up when phase ≈ i+1 (phase 1..4 are the four process
// scenes) — the camera parks exactly at a planet per scene, so the additive
// dust cloud is only ever flown through briefly between scenes, never dwelt
// in. Count must match the number of process scenes, or the camera parks
// inside the cloud and the frame whites out.
const NODES: THREE.Vector3[] = [
  new THREE.Vector3(-9.5, 1.2, -2),
  new THREE.Vector3(-3.2, -1.3, 2.5),
  new THREE.Vector3(3.2, 1.5, -1.6),
  new THREE.Vector3(9.5, -0.7, 2.6),
];

const CURVE = new THREE.CatmullRomCurve3(NODES, false, "catmullrom", 0.4);

// Frenet frames along the curve — lets particles sit *around* the stream
// (offset along the local normal/binormal) instead of riding the exact
// centreline like beads on a rail.
const FRAME_SEGMENTS = 240;
const FRAMES = CURVE.computeFrenetFrames(FRAME_SEGMENTS, false);

// Writes curve point at u, displaced radially by (radius, angle) in the
// local cross-section plane, into `out`.
function streamPoint(u: number, radius: number, angle: number, out: THREE.Vector3) {
  const uu = THREE.MathUtils.euclideanModulo(u, 1);
  CURVE.getPointAt(uu, out);
  const fi = Math.min(FRAME_SEGMENTS - 1, Math.floor(uu * FRAME_SEGMENTS));
  const n = FRAMES.normals[fi];
  const b = FRAMES.binormals[fi];
  const c = Math.cos(angle) * radius;
  const s = Math.sin(angle) * radius;
  out.x += n.x * c + b.x * s;
  out.y += n.y * c + b.y * s;
  out.z += n.z * c + b.z * s;
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
    const rand = seededRng(0xa3f1);
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

// The stream itself — a hot core tube with energy pulses flowing along its
// length, wrapped in a wide soft halo tube. TubeGeometry's uv.x runs along
// the curve, so the pulse bands are just moving stripes in uv space; uv.y
// wraps the circumference and fades the halo toward its edges so the tube
// reads as a volumetric beam instead of a solid pipe.
const STREAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const STREAM_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uBase;
  uniform float uCore;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }

  void main() {
    // Soft cross-section falloff — brightest at the tube's spine.
    float section = pow(sin(vUv.y * 3.14159265), 2.0);
    // Turbulent flow: three octaves of value noise streaming downstream at
    // different rates — reads as currents and eddies, not a strobe. A slight
    // circumferential term twists the pattern around the tube so opposite
    // sides don't flicker in lockstep.
    float x = vUv.x * 26.0 - uTime * 1.6;
    float n = noise1(x) * 0.5
            + noise1(x * 2.7 + 13.7 - uTime * 0.9) * 0.3
            + noise1(x * 6.3 + 41.3 - uTime * 2.6) * 0.2;
    n += (noise1(vUv.y * 5.0 + x * 0.6) - 0.5) * 0.25;
    float flow = 0.3 + 0.9 * n;
    // Dissolve into the planets' glow at both ends instead of a hard cut.
    float ends = smoothstep(0.0, 0.05, vUv.x) * (1.0 - smoothstep(0.95, 1.0, vUv.x));
    float a = (uBase + uCore * flow) * section * ends;
    gl_FragColor = vec4(uColor * (0.6 + 0.7 * flow), a);
  }
`;

function StreamTube({
  radius,
  base,
  core,
}: {
  radius: number;
  base: number;
  core: number;
}) {
  const geo = useMemo(
    () => new THREE.TubeGeometry(CURVE, 240, radius, 12, false),
    [radius]
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: TEAL.clone() },
      uBase: { value: base },
      uCore: { value: core },
    }),
    [base, core]
  );
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh geometry={geo}>
      <shaderMaterial
        vertexShader={STREAM_VERT}
        fragmentShader={STREAM_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PipelineTube() {
  return (
    <>
      {/* hot core */}
      <StreamTube radius={0.028} base={0.3} core={0.75} />
      {/* volumetric halo */}
      <StreamTube radius={0.11} base={0.04} core={0.14} />
    </>
  );
}

// Soft round dot sprite for the packet points — square GL points read as
// pixels; this radial gradient makes each one a tiny glow.
let _dotTex: THREE.CanvasTexture | null = null;
function dotTexture(): THREE.CanvasTexture {
  if (_dotTex) return _dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _dotTex = new THREE.CanvasTexture(c);
  return _dotTex;
}

// Packets as comets: each has a bright head and a short trail of samples
// pulled backwards along the curve, dimming toward the tail (additive
// blending, so dimmer vertex colour = fading trail). Speeds vary per packet
// and a few run brand-red.
function FlowingPackets({ count = 44, trail = 7 }: { count?: number; trail?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, offsets, speeds, radii, angles, swirls, tints } = useMemo(() => {
    const rng = seededRng(0xbeef);
    const total = count * trail;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const swirls = new Float32Array(count);
    const tints: THREE.Color[] = [];
    for (let i = 0; i < count; i++) {
      offsets[i] = rng();
      speeds[i] = 0.03 + rng() * 0.045;
      // Each packet rides its own lane inside the halo and corkscrews
      // slowly around the core — debris in a current, not beads on a rail.
      radii[i] = 0.015 + rng() * 0.07;
      angles[i] = rng() * Math.PI * 2;
      swirls[i] = (rng() - 0.5) * 1.6;
      tints.push(rng() < 0.1 ? RED.clone() : TEAL.clone().lerp(new THREE.Color("#bff6f1"), rng() * 0.6));
    }
    return { positions, colors, offsets, speeds, radii, angles, swirls, tints };
  }, [count, trail]);

  // Scratch vector reused across frames — avoids allocations per frame.
  const p = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const head = (t * speeds[i] + offsets[i]) % 1;
      const angle = angles[i] + t * swirls[i];
      for (let k = 0; k < trail; k++) {
        // Trail stretches with speed, so fast packets streak further; each
        // sample lags the swirl slightly so trails curve with the corkscrew.
        const u = head - k * speeds[i] * 0.09;
        streamPoint(u, radii[i], angle - k * swirls[i] * 0.03, p);
        const j = (i * trail + k) * 3;
        positions[j] = p.x;
        positions[j + 1] = p.y;
        positions[j + 2] = p.z;
        const fade = Math.pow(1 - k / trail, 1.8);
        const tint = tints[i];
        colors[j] = tint.r * fade;
        colors[j + 1] = tint.g * fade;
        colors[j + 2] = tint.b * fade;
      }
    }
    if (ref.current) {
      const geo = ref.current.geometry;
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={dotTexture()}
        vertexColors
        size={0.16}
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Fine spray drifting slowly around the beam — gives the stream physical
// volume, like vapour caught in the current. Particles further from the core
// are dimmer, and each breathes radially a little so the cloud isn't rigid.
function StreamMist({ count = 240 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, offsets, speeds, radii, angles, drifts } = useMemo(() => {
    const rng = seededRng(0x50f7);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const drifts = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      offsets[i] = rng();
      speeds[i] = 0.006 + rng() * 0.014;
      radii[i] = 0.05 + rng() * 0.22;
      angles[i] = rng() * Math.PI * 2;
      drifts[i] = (rng() - 0.5) * 0.5;
      // Dimmer the further from the core, with slight per-particle variance.
      const fade = (1 - radii[i] / 0.27) * (0.35 + rng() * 0.4);
      colors[i * 3 + 0] = TEAL.r * fade;
      colors[i * 3 + 1] = TEAL.g * fade;
      colors[i * 3 + 2] = TEAL.b * fade;
    }
    return { positions, colors, offsets, speeds, radii, angles, drifts };
  }, [count]);

  const p = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const u = (t * speeds[i] + offsets[i]) % 1;
      const breathe = 1 + Math.sin(t * 0.6 + i * 2.3) * 0.18;
      streamPoint(u, radii[i] * breathe, angles[i] + t * drifts[i], p);
      positions[i * 3 + 0] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    if (ref.current) {
      (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={dotTexture()}
        vertexColors
        size={0.07}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Fresnel-rim planet shader — a dark body with a soft fake key light for the
// terminator and a bright teal glow that hugs the silhouette (the backlit
// planet look from the mockups). uBoost lifts the rim when the camera parks.
const PLANET_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const PLANET_FRAG = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uRim;
  uniform float uBoost;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.6);
    // Key light from the lower-left — the rim concentrates into a bright
    // crescent on that side instead of an even outline (mockup look).
    vec3 lightDir = normalize(vec3(-0.55, -0.4, 0.55));
    float litRim = clamp(dot(n, lightDir), 0.0, 1.0);
    float lit = 0.38 + 0.55 * litRim;
    float rim = fres * (0.22 + 1.25 * pow(litRim, 1.4));
    vec3 col = uBody * lit + uRim * rim * (1.5 + uBoost * 1.5);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Shared halo texture — a hollow radial gradient that peaks just outside the
// planet's silhouette (planet edge sits at ~0.53 of the sprite half-size for
// r=0.82 in a 3.1-scaled sprite), so the glow hugs the limb instead of
// washing over the dark body. Built lazily on the client, shared by all four.
let _glowTex: THREE.CanvasTexture | null = null;
function glowTexture(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(116, 224, 216, 0)");
  g.addColorStop(0.44, "rgba(116, 224, 216, 0.04)");
  g.addColorStop(0.53, "rgba(116, 224, 216, 0.5)");
  g.addColorStop(0.64, "rgba(116, 224, 216, 0.18)");
  g.addColorStop(1, "rgba(116, 224, 216, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

// A planet: fresnel-rim body plus an additive atmosphere halo and two tilted
// orbit rings each carrying moons that circle it continuously. Activation
// (camera parked at this planet) brightens the rim/rings/atmosphere, grows
// the planet and speeds the moons up.
function PlanetMesh({
  index,
  phaseRef,
  position,
}: {
  index: number;
  phaseRef: { current: number };
  position: THREE.Vector3;
}) {
  const group = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.SpriteMaterial>(null);
  const ring1Mat = useRef<THREE.MeshBasicMaterial>(null);
  const ring2Mat = useRef<THREE.MeshBasicMaterial>(null);
  const orbit1 = useRef<THREE.Group>(null);
  const orbit2 = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uBody: { value: new THREE.Color("#3d5a7c") },
      uRim: { value: new THREE.Color("#74e0d8") },
      uBoost: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const a = activationFor(phaseRef.current, index);
    g.rotation.y += delta * 0.05;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4 + index) * 0.03 * a;
    g.scale.setScalar((0.9 + a * 0.5) * pulse);
    uniforms.uBoost.value = a;
    if (glowMat.current) glowMat.current.opacity = 0.55 + a * 0.45;
    if (ring1Mat.current) ring1Mat.current.opacity = 0.35 + a * 0.45;
    if (ring2Mat.current) ring2Mat.current.opacity = 0.2 + a * 0.35;
    if (orbit1.current) orbit1.current.rotation.z += delta * (0.25 + a * 0.5);
    if (orbit2.current) orbit2.current.rotation.z -= delta * (0.18 + a * 0.35);
  });

  // Per-planet ring tilts so the four systems don't read as clones.
  const tilt1: [number, number, number] = [Math.PI / 2.35, 0, 0.3 + index * 0.35];
  const tilt2: [number, number, number] = [Math.PI / 2.05, 0.35, -0.5 + index * 0.3];

  return (
    <group ref={group} position={position}>
      {/* planet body — fresnel rim shader */}
      <mesh>
        <sphereGeometry args={[0.82, 48, 48]} />
        <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={uniforms} />
      </mesh>
      {/* atmosphere halo — billboard sprite hugging the silhouette; the
         planet body depth-occludes its center, so only the limb glows */}
      <sprite scale={[3.1, 3.1, 1]}>
        <spriteMaterial
          ref={glowMat}
          map={glowTexture()}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {/* inner orbit ring + moon */}
      <group rotation={tilt1}>
        <mesh>
          <ringGeometry args={[1.35, 1.42, 72]} />
          <meshBasicMaterial ref={ring1Mat} color={TEAL} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <group ref={orbit1} rotation={[0, 0, index * 1.7]}>
          <mesh position={[1.385, 0, 0]}>
            <sphereGeometry args={[0.09, 14, 14]} />
            <meshBasicMaterial color={TEAL} />
          </mesh>
        </group>
      </group>
      {/* outer orbit ring + two moons (one red accent) */}
      <group rotation={tilt2}>
        <mesh>
          <ringGeometry args={[1.85, 1.91, 80]} />
          <meshBasicMaterial ref={ring2Mat} color={TEAL} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <group ref={orbit2} rotation={[0, 0, index * 0.9]}>
          <mesh position={[1.88, 0, 0]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshBasicMaterial color={TEAL} />
          </mesh>
          <mesh position={[-1.88, 0, 0]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color={RED} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function CameraRig({ phaseRef }: { phaseRef: { current: number } }) {
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const cam = state.camera;
    const t = state.clock.elapsedTime;
    // Scroll progress is read from a mutable ref written by the parent's
    // ScrollTrigger — keeps the whole R3F tree out of React's render loop.
    const phase = phaseRef.current;

    // Wide overview during the intro scene (phase 0); transitions to node-tracking by phase 1.
    const intro = Math.max(0, 1 - phase / 1);

    // Active planet interpolation (phase 1..4 → segments 0..3)
    const last = NODES.length - 1;
    const stage = Math.max(0, Math.min(last, phase - 1));
    const lo = Math.floor(stage);
    const hi = Math.min(last, lo + 1);
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

export default function HeroScene({ phaseRef }: { phaseRef: { current: number } }) {
  const [canvasRef, inView] = useInView<HTMLCanvasElement>();
  return (
    <Canvas
      ref={canvasRef}
      frameloop={inView ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.8, 18], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig phaseRef={phaseRef} />
      <AmbientCloud />
      <PipelineTube />
      <FlowingPackets />
      <StreamMist />
      {NODES.map((pos, i) => (
        <PlanetMesh key={i} index={i} phaseRef={phaseRef} position={pos} />
      ))}
    </Canvas>
  );
}
