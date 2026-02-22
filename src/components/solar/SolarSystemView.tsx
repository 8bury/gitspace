"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Ring } from "@react-three/drei";
import * as THREE from "three";
import { SolarSystem, Planet } from "@/types";
import PlanetTooltip from "./PlanetTooltip";

// ─── Star (central) ──────────────────────────────────────────────────────────

function StarMesh({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.4, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        roughness={0.4}
        metalness={0}
      />
    </mesh>
  );
}

// ─── Orbit ring ───────────────────────────────────────────────────────────────

function OrbitLine({ radius }: { radius: number }) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: "#ffffff", opacity: 0.08, transparent: true });
  const line = new THREE.Line(geometry, material);
  return <primitive object={line} />;
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

  // Deterministic but spread-out initial angle based on planet id
  const phaseOffset = (planet.id * 2.399963) % (Math.PI * 2); // golden angle spread

  const radius = planet.size * 0.6 + 0.15;
  const segments = planet.type === "gaseous" ? 32 : 16;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * planet.orbitSpeed + phaseOffset;
    groupRef.current.position.x = Math.cos(t) * planet.orbitRadius;
    groupRef.current.position.z = Math.sin(t) * planet.orbitRadius;

    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  const emissiveIntensity = hovered ? 0.4 : 0.05;
  const scale = hovered ? 1.15 : 1;

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerOver={() => { setHovered(true); onHover(planet); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); onHover(null); document.body.style.cursor = "default"; }}
        onClick={() => onClick(planet)}
      >
        {planet.type === "gaseous" ? (
          <sphereGeometry args={[radius, segments, segments]} />
        ) : planet.type === "icy" ? (
          <icosahedronGeometry args={[radius, 1]} />
        ) : (
          <dodecahedronGeometry args={[radius, 0]} />
        )}
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.color}
          emissiveIntensity={emissiveIntensity}
          roughness={planet.type === "gaseous" ? 0.2 : 0.8}
          metalness={planet.type === "icy" ? 0.6 : 0.1}
        />
      </mesh>

      {/* Saturn-like ring for high-star repos */}
      {planet.hasRing && (
        <Ring args={[radius * 1.4, radius * 2.1, 32]} rotation={[Math.PI / 2.5, 0, 0]}>
          <meshBasicMaterial color={planet.color} opacity={0.4} transparent side={THREE.DoubleSide} />
        </Ring>
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
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={4} distance={80} color={system.star.color} />
      <Stars radius={120} depth={60} count={4000} factor={4} fade />

      <StarMesh color={system.star.color} />

      {system.planets.map((planet) => (
        <group key={planet.id}>
          <OrbitLine radius={planet.orbitRadius} />
          <PlanetMesh planet={planet} onHover={onHover} onClick={onClick} />
        </group>
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={80}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function SolarSystemView({ system }: { system: SolarSystem }) {
  const [hoveredPlanet, setHoveredPlanet] = useState<Planet | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);

  return (
    <div className="relative w-full h-[calc(100vh-220px)] min-h-[500px]">
      <Canvas camera={{ position: [0, 20, 40], fov: 50 }} gl={{ antialias: true }}>
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
        <p className="text-zinc-400 text-xs">{system.planets.length} planets</p>
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
