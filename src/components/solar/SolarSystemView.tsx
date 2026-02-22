"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { OrbitControls, Stars, Ring, Torus } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SolarSystem, Planet, Star } from "@/types";
import PlanetTooltip from "./PlanetTooltip";

extend({ Line_: THREE.Line });

// ─── Shared high-res sphere geometry ─────────────────────────────────────────

const HI_SPHERE = new THREE.SphereGeometry(1, 64, 64);
const MED_SPHERE = new THREE.SphereGeometry(1, 48, 48);

// ─── Procedural texture utils ─────────────────────────────────────────────────

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

  // seeded pseudo-random
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  if (type === "gaseous") {
    // Horizontal bands like Jupiter
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

    // Swirl lines
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 12; i++) {
      const y = rng() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < size; x += 4) {
        ctx.lineTo(x, y + Math.sin(x * 0.04 + rng() * 6) * 8);
      }
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1 + rng() * 2;
      ctx.stroke();
    }
  } else if (type === "icy") {
    // Crystal / cracked ice surface
    ctx.fillStyle = `#${ca.getHexString()}`;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 40; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const len = 20 + rng() * 80;
      const angle = rng() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.strokeStyle = `#${cb.getHexString()}`;
      ctx.lineWidth = 0.5 + rng() * 1.5;
      ctx.stroke();
    }
    // Highlight spots
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 20; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const r = 2 + rng() * 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
    }
  } else {
    // Rocky: noise-based splotches
    ctx.fillStyle = `#${ca.getHexString()}`;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 60; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const rx = 10 + rng() * 60;
      const ry = 8 + rng() * 40;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `#${cb.getHexString()}`;
      ctx.fill();
    }

    // Craters
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 15; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const r = 4 + rng() * 20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ─── Star ─────────────────────────────────────────────────────────────────────

function StarMesh({ star }: { star: Star }) {
  const ref = useRef<THREE.Mesh>(null);
  const radius = star.size;

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.08;
  });

  return (
    <mesh ref={ref} geometry={HI_SPHERE} scale={radius}>
      <meshStandardMaterial
        color={star.color}
        emissive={star.color}
        emissiveIntensity={1.2}
        roughness={0.3}
        metalness={0}
      />
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

// ─── Planet ───────────────────────────────────────────────────────────────────

interface PlanetMeshProps {
  planet: Planet;
  onHover: (planet: Planet | null) => void;
  onClick: (planet: Planet) => void;
}

function PlanetMesh({ planet, onHover, onClick }: PlanetMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const phaseOffset = (planet.id * 2.399963) % (Math.PI * 2);
  const radius = planet.size * 0.6 + 0.2;

  const texture = useMemo(
    () => makeProceduralTexture(planet.id, planet.type, planet.color, planet.secondaryColor),
    [planet.id, planet.type, planet.color, planet.secondaryColor]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * planet.orbitSpeed + phaseOffset;
    groupRef.current.position.x = Math.cos(t) * planet.orbitRadius;
    groupRef.current.position.z = Math.sin(t) * planet.orbitRadius;

    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * (planet.type === "gaseous" ? 0.15 : 0.25);
    }
  });

  const roughness = planet.type === "gaseous" ? 0.15 : planet.type === "icy" ? 0.05 : 0.85;
  const metalness = planet.type === "icy" ? 0.5 : 0.05;
  const emissive = hovered ? planet.color : "#000000";
  const emissiveIntensity = hovered ? 0.3 : 0;
  const scale = hovered ? 1.12 : 1;

  // Geometry: high-poly sphere for all types — shape differentiated via texture + material
  const geometry = planet.type === "icy"
    ? new THREE.IcosahedronGeometry(radius, 5)  // slightly faceted feel
    : HI_SPHERE;

  return (
    <group ref={groupRef}>
      {/* Axial tilt wrapper */}
      <group rotation={[0, 0, planet.axialTilt]}>
        {/* Planet surface */}
        <mesh
          ref={meshRef}
          geometry={geometry}
          scale={planet.type !== "icy" ? radius : 1}
          onPointerOver={() => {
            setHovered(true);
            onHover(planet);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            onHover(null);
            document.body.style.cursor = "default";
          }}
          onClick={() => onClick(planet)}
        >
          <meshStandardMaterial
            map={texture}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            roughness={roughness}
            metalness={metalness}
          />
        </mesh>

        {/* Scale wrapper for hover */}
        <group scale={scale}>
          {/* Ring (high-star repos) */}
          {planet.hasRing && (
            <group rotation={[Math.PI / 2.2, 0, planet.axialTilt * 0.5]}>
              <Torus args={[radius * 1.75, radius * 0.28, 4, 64]}>
                <meshBasicMaterial
                  color={planet.color}
                  opacity={0.35}
                  transparent
                  side={THREE.DoubleSide}
                />
              </Torus>
              {/* Outer faint ring */}
              <Torus args={[radius * 2.2, radius * 0.12, 4, 64]}>
                <meshBasicMaterial
                  color={planet.secondaryColor}
                  opacity={0.15}
                  transparent
                  side={THREE.DoubleSide}
                />
              </Torus>
            </group>
          )}
        </group>
      </group>

      {/* Moon (high-fork repos) */}
      {planet.hasMoon && (
        <Moon planetRadius={radius} color={planet.secondaryColor} seed={planet.id} />
      )}
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  system: SolarSystem;
  onHover: (planet: Planet | null) => void;
  onClick: (planet: Planet) => void;
}

function Scene({ system, onHover, onClick }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight
        position={[0, 0, 0]}
        intensity={6}
        distance={120}
        color={system.star.color}
        decay={1.5}
      />
      <Stars radius={160} depth={80} count={5000} factor={4} fade saturation={0.3} />

      <StarMesh star={system.star} />

      {system.planets.map((planet) => (
        <group key={planet.id}>
          <OrbitLine radius={planet.orbitRadius} />
          <PlanetMesh planet={planet} onHover={onHover} onClick={onClick} />
        </group>
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={100}
        autoRotate
        autoRotateSpeed={0.25}
      />

      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function SolarSystemView({ system }: { system: SolarSystem }) {
  const [hoveredPlanet, setHoveredPlanet] = useState<Planet | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);

  return (
    <div className="relative w-full h-[calc(100vh-220px)] min-h-[500px]">
      <Canvas
        camera={{ position: [0, 22, 45], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Scene
          system={system}
          onHover={setHoveredPlanet}
          onClick={setSelectedPlanet}
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

      {/* Hover tooltip */}
      {hoveredPlanet && !selectedPlanet && (
        <PlanetTooltip planet={hoveredPlanet} />
      )}

      {/* Selected planet panel */}
      {selectedPlanet && (
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 text-sm max-w-sm w-full">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedPlanet.color }} />
              <span className="font-semibold break-all">{selectedPlanet.repoName}</span>
            </div>
            <button
              onClick={() => setSelectedPlanet(null)}
              className="text-zinc-500 hover:text-white text-xs shrink-0"
            >
              ✕
            </button>
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
          <a
            href={selectedPlanet.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-indigo-400 hover:text-indigo-300"
          >
            View on GitHub →
          </a>
        </div>
      )}
    </div>
  );
}
