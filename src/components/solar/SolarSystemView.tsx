"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Stars, Torus, Html, Billboard } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SolarSystem, Planet, Star } from "@/types";
import PlanetTooltip from "./PlanetTooltip";

extend({ Line_: THREE.Line });

// ─── Shared geometries ────────────────────────────────────────────────────────

const HI_SPHERE = new THREE.SphereGeometry(1, 64, 64);
const MED_SPHERE = new THREE.SphereGeometry(1, 48, 48);
const SM_SPHERE = new THREE.SphereGeometry(1, 16, 16);

// ─── Procedural texture ───────────────────────────────────────────────────────

function makeProceduralTexture(
  seed: number,
  type: "rocky" | "gaseous" | "icy",
  colorA: string,
  colorB: string
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const ca = new THREE.Color(colorA);
  const cb = new THREE.Color(colorB);
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  if (type === "gaseous") {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    const bands = 6 + Math.floor(rng() * 6);
    for (let i = 0; i <= bands; i++) {
      const t = i / bands;
      const mix = 0.3 + rng() * 0.7;
      const r = ca.r * mix + cb.r * (1 - mix);
      const g = ca.g * mix + cb.g * (1 - mix);
      const b = ca.b * mix + cb.b * (1 - mix);
      gradient.addColorStop(t, `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 12; i++) {
      const y = rng() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < size; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.04 + rng() * 6) * 8);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1 + rng() * 2;
      ctx.stroke();
    }
  } else if (type === "icy") {
    ctx.fillStyle = `#${ca.getHexString()}`;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 40; i++) {
      const x = rng() * size; const y = rng() * size;
      const len = 20 + rng() * 80; const angle = rng() * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.strokeStyle = `#${cb.getHexString()}`; ctx.lineWidth = 0.5 + rng() * 1.5; ctx.stroke();
    }
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 20; i++) {
      const x = rng() * size; const y = rng() * size; const r = 2 + rng() * 10;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = "white"; ctx.fill();
    }
  } else {
    ctx.fillStyle = `#${ca.getHexString()}`;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 60; i++) {
      const x = rng() * size; const y = rng() * size;
      const rx = 10 + rng() * 60; const ry = 8 + rng() * 40;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `#${cb.getHexString()}`; ctx.fill();
    }
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 15; i++) {
      const x = rng() * size; const y = rng() * size; const r = 4 + rng() * 20;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ─── Star ─────────────────────────────────────────────────────────────────────

function StarMesh({ star }: { star: Star }) {
  const ref = useRef<THREE.Mesh>(null);
  const radius = star.size * 2.2;
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.08; });
  return (
    <mesh ref={ref} geometry={HI_SPHERE} scale={radius}>
      <meshStandardMaterial color={star.color} emissive={star.color} emissiveIntensity={1.2} roughness={0.3} metalness={0} />
    </mesh>
  );
}

// ─── Orbit line ───────────────────────────────────────────────────────────────

function OrbitLine({ radius }: { radius: number }) {
  const obj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: "#ffffff", opacity: 0.07, transparent: true });
    return new THREE.Line(geo, mat);
  }, [radius]);
  return <primitive object={obj} />;
}

// ─── Moon ─────────────────────────────────────────────────────────────────────

function Moon({ planetRadius, color, seed }: { planetRadius: number; color: string; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const moonRadius = planetRadius * 0.28;
  const orbitR = planetRadius * 2.2;
  const speed = 0.6 + (seed % 7) * 0.08;
  const phase = (seed * 1.23) % (Math.PI * 2);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.x = Math.cos(t) * orbitR;
    ref.current.position.y = Math.sin(t * 0.3) * orbitR * 0.15;
    ref.current.position.z = Math.sin(t) * orbitR;
  });
  return (
    <group ref={ref}>
      <mesh geometry={MED_SPHERE} scale={moonRadius}>
        <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

// ─── Reticle ──────────────────────────────────────────────────────────────────

function Reticle({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  const size = radius * 1.2;
  const arm = size * 0.35;
  const thick = 0.025;
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5) * 0.04; });
  const mat = <meshBasicMaterial color={color} />;
  const corners: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      <group ref={ref}>
        {corners.map(([sx, sy], i) => (
          <group key={i}>
            <mesh position={[sx * (size - arm / 2), sy * size, 0]}><boxGeometry args={[arm, thick, thick]} />{mat}</mesh>
            <mesh position={[sx * size, sy * (size - arm / 2), 0]}><boxGeometry args={[thick, arm, thick]} />{mat}</mesh>
          </group>
        ))}
      </group>
    </Billboard>
  );
}

// ─── Energy pulse ─────────────────────────────────────────────────────────────

function EnergyPulse({ radius, color, onDone }: { radius: number; color: string; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const progress = useRef(0);

  useFrame((_, delta) => {
    progress.current += delta * 1.8;
    if (progress.current >= 1) { onDone(); return; }
    const s = radius + progress.current * radius * 4;
    if (ref.current) ref.current.scale.setScalar(s);
    if (matRef.current) matRef.current.opacity = (1 - progress.current) * 0.6;
  });

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      <mesh ref={ref} geometry={HI_SPHERE} scale={radius}>
        <meshBasicMaterial ref={matRef} color={color} transparent opacity={0.6} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

// ─── Shooting star ────────────────────────────────────────────────────────────

function ShootingStar() {
  const ref = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const state = useRef(newShooter());

  function newShooter() {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI * 0.4;
    const r = 80 + Math.random() * 40;
    const start = new THREE.Vector3(
      r * Math.sin(theta) * Math.cos(phi),
      20 + Math.random() * 30,
      r * Math.sin(theta) * Math.sin(phi)
    );
    const dir = new THREE.Vector3(-start.x, -10 - Math.random() * 20, -start.z).normalize();
    return { start: start.clone(), dir, progress: 0, speed: 0.4 + Math.random() * 0.4, delay: 4 + Math.random() * 10 };
  }

  useFrame((_, delta) => {
    const s = state.current;
    s.delay -= delta;
    if (s.delay > 0) { if (ref.current) ref.current.visible = false; return; }
    if (ref.current) ref.current.visible = true;
    s.progress += delta * s.speed;
    if (s.progress >= 1) { state.current = newShooter(); return; }
    const pos = s.start.clone().addScaledVector(s.dir, s.progress * 60);
    if (ref.current) ref.current.position.copy(pos);
    if (trailRef.current) trailRef.current.scale.z = 1 + s.progress * 3;
  });

  return (
    <group ref={ref} visible={false}>
      <mesh geometry={SM_SPHERE} scale={0.12}>
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={trailRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.001, 1, 6]} />
        <meshBasicMaterial color="white" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// ─── Asteroids ────────────────────────────────────────────────────────────────

function AsteroidBelt({ innerRadius, outerRadius, count = 60 }: { innerRadius: number; outerRadius: number; count?: number }) {
  const asteroids = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const r = innerRadius + Math.random() * (outerRadius - innerRadius);
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 1.5;
      const speed = (0.02 + Math.random() * 0.03) * (Math.random() > 0.5 ? 1 : -1);
      const size = 0.04 + Math.random() * 0.1;
      return { r, angle, y, speed, size, phase: Math.random() * Math.PI * 2 };
    });
  }, [innerRadius, outerRadius, count]);

  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    asteroids.forEach((a, i) => {
      a.angle += delta * a.speed;
      const mesh = refs.current[i];
      if (!mesh) return;
      mesh.position.x = Math.cos(a.angle) * a.r;
      mesh.position.z = Math.sin(a.angle) * a.r;
      mesh.position.y = a.y;
      mesh.rotation.x += delta * 0.5;
      mesh.rotation.y += delta * 0.3;
    });
  });

  return (
    <>
      {asteroids.map((a, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          scale={a.size}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#888877" roughness={1} metalness={0.1} />
        </mesh>
      ))}
    </>
  );
}

// ─── Camera zoom to planet ────────────────────────────────────────────────────

function CameraController({
  planetPosition,
  controlsRef,
  active,
}: {
  planetPosition: React.RefObject<THREE.Vector3 | null>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  active: boolean;
}) {
  const { camera } = useThree();
  const flyingRef = useRef(false);
  const returningRef = useRef(false);
  // Camera offset relative to planet, updated every frame after fly-in completes
  const camOffsetRef = useRef(new THREE.Vector3(0, 8, 14));
  const prevPosRef = useRef<THREE.Vector3 | null>(null);
  const origin = new THREE.Vector3(0, 0, 0);

  useEffect(() => {
    if (active) {
      flyingRef.current = true;
      returningRef.current = false;
      prevPosRef.current = null;
    } else {
      returningRef.current = true;
    }
  }, [active]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (returningRef.current) {
      controls.target.lerp(origin, delta * 4);
      controls.update();
      if (controls.target.length() < 0.05) {
        controls.target.set(0, 0, 0);
        returningRef.current = false;
      }
      return;
    }

    const pos = planetPosition.current;
    if (!active || !pos) return;

    // Snap target to planet
    controls.target.copy(pos);

    if (flyingRef.current) {
      // Fly in: approach from current position
      const dir = camera.position.clone().sub(pos).normalize();
      const desired = pos.clone().add(dir.multiplyScalar(12));
      desired.y = pos.y + 6;
      camera.position.lerp(desired, delta * 3);

      if (camera.position.distanceTo(desired) < 0.4) {
        flyingRef.current = false;
        // Lock in the offset from planet at this moment
        camOffsetRef.current = camera.position.clone().sub(pos);
      }
    } else {
      // After fly-in: translate camera by how much the planet moved this frame
      if (prevPosRef.current) {
        const delta_pos = pos.clone().sub(prevPosRef.current);
        camera.position.add(delta_pos);
        // Keep orbit offset in sync for OrbitControls
        camOffsetRef.current.add(delta_pos);
      }
    }

    prevPosRef.current = pos.clone();
    controls.update();
  });

  return null;
}

// ─── Planet ───────────────────────────────────────────────────────────────────

interface PlanetMeshProps {
  planet: Planet;
  onHover: (planet: Planet | null) => void;
  onClick: (planet: Planet, pos: THREE.Vector3) => void;
  speedMultiplier: number;
  isSelected: boolean;
  selectedPosRef: React.RefObject<THREE.Vector3 | null> | null;
}

function PlanetMesh({ planet, onHover, onClick, speedMultiplier, isSelected, selectedPosRef }: PlanetMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pulse, setPulse] = useState(false);

  const angleRef = useRef((planet.id * 2.399963) % (Math.PI * 2));
  const speedMultiplierRef = useRef(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;

  const radius = planet.size * 1.4 + 0.15;

  const texture = useMemo(
    () => makeProceduralTexture(planet.id, planet.type, planet.color, planet.secondaryColor),
    [planet.id, planet.type, planet.color, planet.secondaryColor]
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    angleRef.current += delta * planet.orbitSpeed * speedMultiplierRef.current;
    groupRef.current.position.x = Math.cos(angleRef.current) * planet.orbitRadius;
    groupRef.current.position.z = Math.sin(angleRef.current) * planet.orbitRadius;
    // Write live position for camera tracking
    if (selectedPosRef) selectedPosRef.current = groupRef.current.position.clone();
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (planet.type === "gaseous" ? 0.15 : 0.25) * speedMultiplierRef.current;
    }
  });

  const roughness = planet.type === "gaseous" ? 0.15 : planet.type === "icy" ? 0.05 : 0.85;
  const metalness = planet.type === "icy" ? 0.5 : 0.05;
  const emissive = hovered || isSelected ? planet.color : "#000000";
  const emissiveIntensity = hovered ? 0.3 : isSelected ? 0.15 : 0;
  const scale = hovered ? 1.12 : 1;
  const geometry = planet.type === "icy" ? new THREE.IcosahedronGeometry(radius, 5) : HI_SPHERE;

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, planet.axialTilt]}>
        <mesh
          ref={meshRef}
          geometry={geometry}
          scale={planet.type !== "icy" ? radius : 1}
          onPointerOver={() => { setHovered(true); onHover(planet); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { setHovered(false); onHover(null); document.body.style.cursor = "default"; }}
          onClick={() => {
            setPulse(true);
            onClick(planet, groupRef.current?.position.clone() ?? new THREE.Vector3());
          }}
        >
          <meshStandardMaterial map={texture} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={roughness} metalness={metalness} />
        </mesh>

        <group scale={scale}>
          {planet.hasRing && (
            <group rotation={[Math.PI / 2.2, 0, planet.axialTilt * 0.5]}>
              <Torus args={[radius * 1.75, radius * 0.28, 4, 64]}>
                <meshBasicMaterial color={planet.color} opacity={0.35} transparent side={THREE.DoubleSide} />
              </Torus>
              <Torus args={[radius * 2.2, radius * 0.12, 4, 64]}>
                <meshBasicMaterial color={planet.secondaryColor} opacity={0.15} transparent side={THREE.DoubleSide} />
              </Torus>
            </group>
          )}
        </group>
      </group>

      {planet.hasMoon && <Moon planetRadius={radius} color={planet.secondaryColor} seed={planet.id} />}

      {pulse && <EnergyPulse radius={radius} color={planet.color} onDone={() => setPulse(false)} />}

      <Html center position={[0, -(radius + 0.5), 0]} style={{ pointerEvents: "none" }}>
        <span style={{
          color: isSelected ? planet.color : "rgba(255,255,255,0.55)",
          fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em",
          textTransform: "uppercase", whiteSpace: "nowrap",
          textShadow: "0 0 6px rgba(0,0,0,0.9)", fontWeight: isSelected ? 700 : 400,
        }}>
          {planet.repoName}
        </span>
      </Html>

      {isSelected && <Reticle radius={radius} color={planet.color} />}
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  system: SolarSystem;
  onHover: (planet: Planet | null) => void;
  onClick: (planet: Planet, pos: THREE.Vector3) => void;
  showOrbits: boolean;
  speedMultiplier: number;
  selectedPlanetId: number | null;
}

function Scene({ system, onHover, onClick, showOrbits, speedMultiplier, selectedPlanetId }: SceneProps) {
  const maxOrbit = system.planets.length > 0
    ? Math.max(...system.planets.map(p => p.orbitRadius))
    : 20;

  const controlsRef = useRef<OrbitControlsImpl>(null);
  // Shared live position of the selected planet, updated every frame by PlanetMesh
  const selectedPosRef = useRef<THREE.Vector3 | null>(null);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={18} distance={200} color={system.star.color} decay={1.2} />
      <Stars radius={160} depth={80} count={5000} factor={4} fade saturation={0.3} />

      <StarMesh star={system.star} />

      <AsteroidBelt innerRadius={maxOrbit * 0.55} outerRadius={maxOrbit * 0.65} count={80} />

      <ShootingStar />
      <ShootingStar />

      {system.planets.map((planet) => (
        <group key={planet.id}>
          {showOrbits && <OrbitLine radius={planet.orbitRadius} />}
          <PlanetMesh
            planet={planet}
            onHover={onHover}
            onClick={onClick}
            speedMultiplier={speedMultiplier}
            isSelected={selectedPlanetId === planet.id}
            selectedPosRef={selectedPlanetId === planet.id ? selectedPosRef : null}
          />
        </group>
      ))}

      <CameraController planetPosition={selectedPosRef} controlsRef={controlsRef} active={selectedPlanetId !== null} />

      <OrbitControls ref={controlsRef} enablePan={false} minDistance={3} maxDistance={100} />

      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  );
}

// ─── Ranking panel ────────────────────────────────────────────────────────────

function RankingPanel({ planets, onSelect }: { planets: Planet[]; onSelect: (p: Planet) => void }) {
  const top3 = useMemo(() =>
    [...planets].sort((a, b) => b.stars - a.stars).slice(0, 3),
    [planets]
  );
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm border border-zinc-800 rounded-xl px-4 py-3 text-xs flex flex-col gap-2 min-w-[180px]">
      <p className="text-zinc-500 uppercase tracking-widest text-[10px]">Top repos</p>
      {top3.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="flex items-center gap-2 hover:text-white text-zinc-300 transition-colors text-left"
        >
          <span>{medals[i]}</span>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="truncate max-w-[120px]">{p.repoName}</span>
          <span className="ml-auto text-zinc-500">⭐{p.stars}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function SolarSystemView({ system }: { system: SolarSystem }) {
  const [hoveredPlanet, setHoveredPlanet] = useState<Planet | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  function handlePlanetClick(planet: Planet, _pos: THREE.Vector3) {
    setSelectedPlanet((prev) => prev?.id === planet.id ? null : planet);
  }

  function handleRankingSelect(planet: Planet) {
    setSelectedPlanet(planet);
  }

  return (
    <div className="relative w-full h-[calc(100vh-220px)] min-h-[500px]">
      <Canvas
        camera={{ position: [0, 22, 45], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.8 }}
      >
        <Scene
          system={system}
          onHover={setHoveredPlanet}
          onClick={handlePlanetClick}
          showOrbits={showOrbits}
          speedMultiplier={speedMultiplier}
          selectedPlanetId={selectedPlanet?.id ?? null}
        />
      </Canvas>

      {/* Star info badge */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm border border-zinc-800 rounded-xl px-4 py-3 text-sm max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ background: system.star.color }} />
          <span className="font-semibold">{system.star.name ?? system.star.username}</span>
        </div>
        {system.star.dominantLanguage && (
          <p className="text-zinc-400 text-xs">Primary: {system.star.dominantLanguage}</p>
        )}
        <p className="text-zinc-400 text-xs">{system.planets.length} planets · {system.star.followers.toLocaleString()} followers</p>
      </div>

      {/* Controls panel */}
      <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm border border-zinc-800 rounded-xl px-4 py-3 flex flex-col gap-3 min-w-[160px]">
        <button
          onClick={() => setShowOrbits((v) => !v)}
          className="text-xs text-zinc-400 hover:text-white transition-colors text-left"
        >
          {showOrbits ? "⊙ Hide orbits" : "⊙ Show orbits"}
        </button>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Speed</span>
            <span className="text-white font-medium">{speedMultiplier.toFixed(1)}×</span>
          </div>
          <input
            type="range" min={0.2} max={8} step={0.1} value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Ranking */}
      <RankingPanel planets={system.planets} onSelect={handleRankingSelect} />

      {/* Hover tooltip */}
      {hoveredPlanet && !selectedPlanet && <PlanetTooltip planet={hoveredPlanet} />}

      {/* Selected planet panel */}
      {selectedPlanet && (
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 text-sm max-w-sm w-full">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedPlanet.color }} />
              <span className="font-semibold break-all">{selectedPlanet.repoName}</span>
            </div>
            <button onClick={() => setSelectedPlanet(null)} className="text-zinc-500 hover:text-white text-xs shrink-0">✕</button>
          </div>
          {selectedPlanet.description && (
            <p className="text-zinc-400 text-xs mb-2">{selectedPlanet.description}</p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400 mb-3">
            <span>⭐ {selectedPlanet.stars} stars</span>
            <span>🍴 {selectedPlanet.forks} forks</span>
            <span>🪐 {selectedPlanet.type}</span>
            {selectedPlanet.language && <span>💻 {selectedPlanet.language}</span>}
            {selectedPlanet.hasRing && <span>💫 has ring</span>}
            {selectedPlanet.hasMoon && <span>🌙 has moon</span>}
          </div>
          <a href={selectedPlanet.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-indigo-400 hover:text-indigo-300">
            View on GitHub →
          </a>
        </div>
      )}
    </div>
  );
}
