"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { GalaxyEntry } from "@/types";
import { GalaxyPosition } from "@/lib/galaxyLayout";

interface Props {
  entry: GalaxyEntry;
  position: GalaxyPosition;
  onSelect: (username: string) => void;
  /** 0–1: followers / maxFollowers across the whole galaxy */
  sizeScale: number;
  isSelected: boolean;
  isNew?: boolean;
}

const MAX_ORBITS = 5;

// ─── Selection reticle (same pattern as SolarSystemView) ──────────────────────
function SystemReticle({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  const size = radius * 1.6;
  const arm  = size * 0.38;
  const thick = 0.04;
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5) * 0.04;
  });
  const mat = <meshBasicMaterial color={color} />;
  const corners: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      <group ref={ref}>
        {corners.map(([sx, sy], i) => (
          <group key={i}>
            <mesh position={[sx * (size - arm / 2), sy * size, 0]}>
              <boxGeometry args={[arm, thick, thick]} />{mat}
            </mesh>
            <mesh position={[sx * size, sy * (size - arm / 2), 0]}>
              <boxGeometry args={[thick, arm, thick]} />{mat}
            </mesh>
          </group>
        ))}
      </group>
    </Billboard>
  );
}

export default function MiniSolarSystem({ entry, position, onSelect, sizeScale, isSelected, isNew }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // Scale-in animation for newly appeared systems
  const birthScale = useRef(isNew ? 0 : 1);
  const birthing = useRef(!!isNew);

  // ── Size math (linear scale → ~13× between min and max) ──────────────────
  const starRadius = 0.3 + sizeScale * 3.7;
  const orbitStart   = starRadius + 0.5 + sizeScale * 0.5;
  const orbitSpacing = 0.8 + sizeScale * 1.2;

  const orbitCount   = Math.min(entry.planetCount, MAX_ORBITS);
  const planetColors = entry.topPlanetColors;

  const orbitRadii = useMemo(
    () => Array.from({ length: orbitCount }, (_, i) => orbitStart + i * orbitSpacing),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orbitCount, orbitStart, orbitSpacing]
  );

  const planetDotRadius = 0.08 + sizeScale * 0.18;
  const starColor = entry.starColor;

  // Luminance-adjusted emissive (brighter when selected)
  const c = new THREE.Color(starColor);
  const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const baseBrightness = (isSelected ? 1.2 : 0.8) + entry.brightnessScore * 1.5;
  const emissiveIntensity = baseBrightness * (1.35 - lum * 0.8);

  const orbitGeometries = useMemo(() => {
    return orbitRadii.map((r) => {
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 64; j++) {
        const angle = (j / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
      }
      return new THREE.BufferGeometry().setFromPoints(points);
    });
  }, [orbitRadii]);

  const planetAngles = useRef<number[]>(
    Array.from({ length: MAX_ORBITS }, (_, i) => (i * 1.618) % (Math.PI * 2))
  );
  const planetMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    // Scale-in animation
    if (birthing.current) {
      birthScale.current = Math.min(1, birthScale.current + delta * 2.5);
      if (groupRef.current) groupRef.current.scale.setScalar(birthScale.current);
      if (birthScale.current >= 1) birthing.current = false;
    }

    // Planet orbits
    for (let i = 0; i < orbitCount; i++) {
      const r = orbitRadii[i];
      planetAngles.current[i] += delta * (0.6 / Math.pow(r, 1.5));
      const mesh = planetMeshRefs.current[i];
      if (mesh) {
        mesh.position.set(
          Math.cos(planetAngles.current[i]) * r,
          0,
          Math.sin(planetAngles.current[i]) * r
        );
      }
    }
  });

  const labelActive = hovered || isSelected;

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      onClick={(e) => { e.stopPropagation(); onSelect(entry.username); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      {/* Star */}
      <mesh>
        <sphereGeometry args={[starRadius, 16, 16]} />
        <meshStandardMaterial
          color={starColor}
          emissive={starColor}
          emissiveIntensity={emissiveIntensity}
          toneMapped={false}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        color={starColor}
        intensity={emissiveIntensity * (1 + sizeScale * 3)}
        distance={10 + sizeScale * 30}
        decay={2}
      />

      {/* Orbit rings */}
      {orbitGeometries.map((geo, i) => (
        <primitive
          key={i}
          object={new THREE.Line(
            geo,
            new THREE.LineBasicMaterial({
              color: isSelected ? starColor : "#88aacc",
              transparent: true,
              opacity: isSelected ? 0.35 : 0.2,
            })
          )}
        />
      ))}

      {/* Planets */}
      {Array.from({ length: orbitCount }, (_, i) => {
        const color = planetColors[i] ?? "#aaaaaa";
        return (
          <mesh key={i} ref={(el) => { planetMeshRefs.current[i] = el; }}>
            <sphereGeometry args={[planetDotRadius, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        );
      })}

      {/* Selection reticle */}
      {isSelected && <SystemReticle radius={starRadius} color={starColor} />}

      {/* Username label */}
      <Html center position={[0, -(starRadius + 0.6), 0]} style={{ pointerEvents: "none" }}>
        <span
          style={{
            color: labelActive ? starColor : "rgba(255,255,255,0.55)",
            fontSize: "10px",
            fontFamily: "monospace",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            textShadow: "0 0 6px rgba(0,0,0,0.9)",
            fontWeight: labelActive ? 700 : 400,
          }}
        >
          {entry.username}
        </span>
      </Html>
    </group>
  );
}
