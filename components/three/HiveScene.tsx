"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import * as THREE from "three";

/**
 * "The Fusion Chamber" — a single continuous scene driven by scroll,
 * staging the product story in four acts:
 *
 *   1. Scattered   — separate minds drifting apart
 *   2. The hive    — pitches land in their own cells
 *   3. Fusion      — every cell streams into one igniting core
 *   4. Crystallize — the core blooms into four new ideas
 *
 * Purely decorative: the page's real content is server-rendered HTML on
 * top of this, and the canvas is aria-hidden.
 */

const AMBER = new THREE.Color("#f6b93b");
const AMBER_HOT = new THREE.Color("#ffd98a");
const INK = "#131110";

const CELL_RINGS = 4; // 61 cells
const MOTES = 48;
const DUST = 220;

// ── helpers ─────────────────────────────────────────────────────────
const seg = (p: number, a: number, b: number) =>
  THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);
const smooth = (t: number) => t * t * (3 - 2 * t);
const phase = (p: number, a: number, b: number) => smooth(seg(p, a, b));

/** Axial honeycomb layout, flat-top hexagons in the XY plane. */
function honeycomb(rings: number, size: number) {
  const out: THREE.Vector3[] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      if (Math.abs(q + r) > rings) continue;
      out.push(
        new THREE.Vector3(
          size * 1.5 * q,
          size * Math.sqrt(3) * (r + q / 2),
          0
        )
      );
    }
  }
  // centre-out ordering so activation ripples outward
  return out.sort((a, b) => a.length() - b.length());
}

interface SceneProps {
  progressRef: React.RefObject<number>;
  pointerRef: React.RefObject<{ x: number; y: number }>;
  animate: boolean;
}

// ── the hive lattice ────────────────────────────────────────────────
function Hive({ progressRef, animate }: Omit<SceneProps, "pointerRef">) {
  const plates = useRef<THREE.InstancedMesh>(null);
  const rims = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const cells = useMemo(() => honeycomb(CELL_RINGS, 1.05), []);

  useFrame((state) => {
    const p = progressRef.current ?? 0;
    const t = animate ? state.clock.elapsedTime : 0;
    if (!plates.current || !rims.current) return;

    // the lattice tilts toward the viewer as it forms, then recedes
    const form = phase(p, 0.2, 0.5);
    const recede = phase(p, 0.55, 0.8);

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      // staggered, centre-out activation
      const act = phase(p, 0.22 + i * 0.0035, 0.3 + i * 0.0035);
      const dim = 1 - recede * 0.92;
      const breathe = animate ? Math.sin(t * 1.2 + i * 0.35) * 0.04 : 0;

      // cells drift in from depth and pull inward during fusion
      const z = THREE.MathUtils.lerp(-16 - i * 0.4, 0, form) - recede * 3;
      const pull = 1 - recede * 0.35;

      dummy.position.set(c.x * pull, c.y * pull, z);
      dummy.rotation.set(Math.PI / 2, 0, form * Math.PI * 0.08);
      dummy.scale.setScalar(act * (0.94 + breathe) * (1 - recede * 0.25));
      dummy.updateMatrix();
      plates.current.setMatrixAt(i, dummy.matrix);

      dummy.scale.setScalar(act * (1.04 + breathe) * (1 - recede * 0.25));
      dummy.position.z = z - 0.06;
      dummy.updateMatrix();
      rims.current.setMatrixAt(i, dummy.matrix);

      // rim glow: brightens on activation, drains away into the core
      const glow = act * dim * (0.5 + (animate ? Math.sin(t * 1.6 + i) * 0.16 : 0));
      tint.copy(AMBER).multiplyScalar(Math.max(glow, 0.04));
      rims.current.setColorAt(i, tint);
    }

    plates.current.instanceMatrix.needsUpdate = true;
    rims.current.instanceMatrix.needsUpdate = true;
    if (rims.current.instanceColor) rims.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={rims}
        args={[undefined, undefined, cells.length]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.98, 0.98, 0.05, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={plates}
        args={[undefined, undefined, cells.length]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.92, 0.92, 0.16, 6]} />
        <meshStandardMaterial
          color="#1d1913"
          metalness={0.85}
          roughness={0.32}
          emissive="#2a1f0d"
          emissiveIntensity={0.5}
        />
      </instancedMesh>
    </group>
  );
}

// ── the pitches themselves ──────────────────────────────────────────
function Motes({ progressRef, animate }: Omit<SceneProps, "pointerRef">) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const cells = useMemo(() => honeycomb(CELL_RINGS, 1.05), []);

  // deterministic per-mote traits (no hydration mismatch: client-only mount)
  const seeds = useMemo(
    () =>
      Array.from({ length: MOTES }, (_, i) => {
        const golden = i * 2.399963229728653; // golden-angle spiral
        const radius = 11 + ((i * 37) % 9);
        return {
          scatter: new THREE.Vector3(
            Math.cos(golden) * radius,
            Math.sin(golden) * radius * 0.62,
            -6 - ((i * 13) % 17)
          ),
          cell: cells[(i * 7) % cells.length].clone(),
          orbit: (i % 4) as 0 | 1 | 2 | 3,
          orbitPhase: (i / MOTES) * Math.PI * 2,
          speed: 0.6 + ((i * 17) % 10) / 14,
          size: 0.075 + ((i * 11) % 7) / 90,
        };
      }),
    [cells]
  );

  useFrame((state) => {
    const p = progressRef.current ?? 0;
    const t = animate ? state.clock.elapsedTime : 0;
    if (!mesh.current) return;

    const toHive = phase(p, 0.08, 0.42);
    const toCore = phase(p, 0.5, 0.72);
    const toOrbit = phase(p, 0.78, 0.96);

    for (let i = 0; i < MOTES; i++) {
      const s = seeds[i];

      // act 1 — drifting apart
      const drift = animate ? Math.sin(t * s.speed + s.orbitPhase) * 0.5 : 0;
      const x0 = s.scatter.x + drift;
      const y0 = s.scatter.y + Math.cos(t * s.speed * 0.8 + s.orbitPhase) * 0.4;
      const z0 = s.scatter.z;

      // act 2 — settled in its own cell
      const x1 = s.cell.x;
      const y1 = s.cell.y;
      const z1 = 0.35;

      // act 3 — everything converges on the core
      const x2 = 0;
      const y2 = 0;
      const z2 = 0;

      // act 4 — orbiting the four new ideas
      const oa = s.orbitPhase + (animate ? t * 0.55 : 0);
      const cx = Math.cos((s.orbit / 4) * Math.PI * 2) * 3.6;
      const cy = Math.sin((s.orbit / 4) * Math.PI * 2) * 2.1;
      const x3 = cx + Math.cos(oa) * 0.95;
      const y3 = cy + Math.sin(oa) * 0.95;
      const z3 = Math.sin(oa * 1.3) * 0.5;

      const ax = THREE.MathUtils.lerp(x0, x1, toHive);
      const ay = THREE.MathUtils.lerp(y0, y1, toHive);
      const az = THREE.MathUtils.lerp(z0, z1, toHive);
      const bx = THREE.MathUtils.lerp(ax, x2, toCore);
      const by = THREE.MathUtils.lerp(ay, y2, toCore);
      const bz = THREE.MathUtils.lerp(az, z2, toCore);

      dummy.position.set(
        THREE.MathUtils.lerp(bx, x3, toOrbit),
        THREE.MathUtils.lerp(by, y3, toOrbit),
        THREE.MathUtils.lerp(bz, z3, toOrbit)
      );

      // shrink into the core, then re-emerge as orbiting sparks
      const swallowed = toCore * (1 - toOrbit);
      dummy.scale.setScalar(s.size * (1 - swallowed * 0.85) * (0.5 + toHive * 0.5));
      dummy.rotation.set(t * 0.4 + i, t * 0.3, 0);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);

      // cool amber at rest, white-hot at the moment of fusion
      tint.copy(AMBER).lerp(AMBER_HOT, swallowed);
      tint.multiplyScalar(0.75 + toHive * 0.6 + swallowed * 1.5);
      mesh.current.setColorAt(i, tint);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, MOTES]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ── the fusion core: the logo's six-spoke spark, in 3D ──────────────
function Core({ progressRef, animate }: Omit<SceneProps, "pointerRef">) {
  const group = useRef<THREE.Group>(null);
  const nucleus = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  const spokes = useMemo(() => [0, 1, 2].map((i) => (i * Math.PI) / 3), []);

  useFrame((state) => {
    const p = progressRef.current ?? 0;
    const t = animate ? state.clock.elapsedTime : 0;
    if (!group.current || !nucleus.current) return;

    const ignite = phase(p, 0.46, 0.72);
    const flash = Math.sin(phase(p, 0.6, 0.8) * Math.PI); // peaks mid-fusion
    const settle = 1 - phase(p, 0.82, 1) * 0.45;

    group.current.scale.setScalar(ignite * settle * 1.15);
    group.current.rotation.z = t * 0.35 + ignite * Math.PI;
    group.current.visible = ignite > 0.001;

    const pulse = 1 + (animate ? Math.sin(t * 3.2) * 0.06 : 0);
    nucleus.current.scale.setScalar((0.55 + flash * 0.5) * pulse);

    if (light.current) light.current.intensity = ignite * (14 + flash * 40);
  });

  return (
    <group ref={group}>
      <pointLight ref={light} color="#ffc663" distance={26} decay={2} />
      <mesh ref={nucleus}>
        <icosahedronGeometry args={[0.62, 3]} />
        <meshBasicMaterial color="#ffe6ae" toneMapped={false} />
      </mesh>
      {spokes.map((rot, i) => (
        <mesh key={i} rotation={[0, 0, rot]}>
          <capsuleGeometry args={[0.075, 2.4, 4, 8]} />
          <meshBasicMaterial color={AMBER} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.75, 0.022, 8, 64]} />
        <meshBasicMaterial color="#ffd489" toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── the four fused ideas ────────────────────────────────────────────
function Crystals({ progressRef, animate }: Omit<SceneProps, "pointerRef">) {
  const group = useRef<THREE.Group>(null);
  const slots = useMemo(
    () =>
      [0, 1, 2, 3].map((i) => ({
        angle: (i / 4) * Math.PI * 2,
        x: Math.cos((i / 4) * Math.PI * 2) * 3.6,
        y: Math.sin((i / 4) * Math.PI * 2) * 2.1,
        spin: 0.25 + i * 0.06,
      })),
    []
  );

  useFrame((state) => {
    const p = progressRef.current ?? 0;
    const t = animate ? state.clock.elapsedTime : 0;
    if (!group.current) return;

    const born = phase(p, 0.76, 0.98);
    group.current.visible = born > 0.001;
    group.current.rotation.z = animate ? t * 0.08 : 0;

    group.current.children.forEach((child, i) => {
      const s = slots[i];
      if (!s) return;
      const stagger = phase(p, 0.76 + i * 0.03, 0.94 + i * 0.03);
      child.position.set(s.x * born, s.y * born, Math.sin(t * 0.5 + i) * 0.3);
      child.scale.setScalar(stagger * 0.92);
      child.rotation.y = t * s.spin + i;
      child.rotation.x = Math.PI / 2;
    });
  });

  return (
    <group ref={group}>
      {slots.map((_, i) => (
        <mesh key={i}>
          <cylinderGeometry args={[0.72, 0.72, 0.34, 6]} />
          <meshStandardMaterial
            color="#241d12"
            metalness={0.92}
            roughness={0.22}
            emissive={AMBER}
            emissiveIntensity={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── far-field dust for depth ────────────────────────────────────────
function Dust({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const golden = i * 2.399963229728653;
      const radius = 14 + ((i * 29) % 26);
      positions[i * 3] = Math.cos(golden) * radius;
      positions[i * 3 + 1] = Math.sin(golden) * radius * 0.7;
      positions[i * 3 + 2] = -22 - ((i * 19) % 30);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((state) => {
    if (ref.current && animate) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.012;
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.09}
        color="#8a7a63"
        transparent
        opacity={0.5}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

// ── camera choreography ─────────────────────────────────────────────
function Rig({ progressRef, pointerRef, animate }: SceneProps) {
  useFrame((state, delta) => {
    const p = progressRef.current ?? 0;
    const ptr = pointerRef.current ?? { x: 0, y: 0 };

    // dolly: wide → settle on the hive → push into the fusion → pull back
    const z =
      16 -
      phase(p, 0.05, 0.45) * 5 - // approach the forming hive
      phase(p, 0.5, 0.74) * 4.2 + // push into the ignition
      phase(p, 0.78, 1) * 5.4; // pull back to reveal the ideas
    const y = phase(p, 0.1, 0.5) * 0.6 - phase(p, 0.55, 0.8) * 0.6 + phase(p, 0.8, 1) * 1.1;
    const x = Math.sin(p * Math.PI) * 1.8;

    // gentle parallax so the scene feels physically present
    const px = animate ? ptr.x * 0.9 : 0;
    const py = animate ? ptr.y * 0.5 : 0;

    const k = 1 - Math.pow(0.0016, delta); // frame-rate independent damping
    state.camera.position.x += (x + px - state.camera.position.x) * k;
    state.camera.position.y += (y + py - state.camera.position.y) * k;
    state.camera.position.z += (z - state.camera.position.z) * k;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Effects({ progressRef }: { progressRef: React.RefObject<number> }) {
  const bloom = useRef<BloomEffect>(null);

  useFrame(() => {
    if (!bloom.current) return;
    const p = progressRef.current ?? 0;
    // the whole scene blooms hardest at the moment of fusion
    bloom.current.intensity = 0.85 + Math.sin(phase(p, 0.5, 0.85) * Math.PI) * 1.5;
  });

  return (
    <EffectComposer>
      <Bloom
        ref={bloom}
        mipmapBlur
        luminanceThreshold={0.32}
        luminanceSmoothing={0.5}
        intensity={0.9}
      />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}

export default function HiveScene({
  progressRef,
  pointerRef,
  animate,
  quality,
  active,
}: SceneProps & { quality: "high" | "low"; active: boolean }) {
  return (
    <Canvas
      dpr={quality === "high" ? [1, 1.8] : [1, 1.2]}
      camera={{ position: [0, 0, 16], fov: 46 }}
      gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
      // stop rendering entirely once the story has scrolled out of view
      frameloop={active ? "always" : "never"}
      style={{ background: INK }}
    >
      <fog attach="fog" args={[INK, 12, 46]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 10]} intensity={1.5} color="#fff2d8" />
      <directionalLight position={[-8, -4, 4]} intensity={0.5} color="#6f8dff" />

      <Dust animate={animate} />
      <Hive progressRef={progressRef} animate={animate} />
      <Motes progressRef={progressRef} animate={animate} />
      <Core progressRef={progressRef} animate={animate} />
      <Crystals progressRef={progressRef} animate={animate} />

      <Rig progressRef={progressRef} pointerRef={pointerRef} animate={animate} />
      {quality === "high" && <Effects progressRef={progressRef} />}
    </Canvas>
  );
}
