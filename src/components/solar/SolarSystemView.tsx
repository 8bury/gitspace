"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Stars, Torus, Html, Billboard } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SolarSystem, Planet, Star } from "@/types";
import PlanetTooltip from "./PlanetTooltip";
import PlanetSidebar from "./PlanetSidebar";
import LegendPanel from "./LegendPanel";

extend({ Line_: THREE.Line });

// ─── Shared geometries ────────────────────────────────────────────────────────

const HI_SPHERE = new THREE.SphereGeometry(1, 64, 64);
const MED_SPHERE = new THREE.SphereGeometry(1, 48, 48);
const SM_SPHERE = new THREE.SphereGeometry(1, 16, 16);

function stableNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

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

/** Scales emissive intensity inversely to perceived luminance.
 *  White needs less boost (bloom amplifies it a lot); dark colors need more. */
function emissiveForColor(hex: string, base: number): number {
  const c = new THREE.Color(hex);
  const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  return base * (1.35 - lum * 0.8);
}

function StarMesh({ star }: { star: Star }) {
  const ref = useRef<THREE.Mesh>(null);
  const radius = star.size * 2.2;
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.08; });
  return (
    <mesh ref={ref} geometry={HI_SPHERE} scale={radius}>
      <meshStandardMaterial color={star.color} emissive={star.color} emissiveIntensity={emissiveForColor(star.color, 1.2)} roughness={0.3} metalness={0} />
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
      const base = i + innerRadius * 0.37 + outerRadius * 0.19;
      const r = innerRadius + stableNoise(base + 1) * (outerRadius - innerRadius);
      const angle = stableNoise(base + 2) * Math.PI * 2;
      const y = (stableNoise(base + 3) - 0.5) * 1.5;
      const direction = stableNoise(base + 4) > 0.5 ? 1 : -1;
      const speed = (0.02 + stableNoise(base + 5) * 0.03) * direction;
      const size = 0.04 + stableNoise(base + 6) * 0.1;
      return { r, angle, y, speed, size };
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

  const radius = planet.size * 1.4 + 0.15;

  const texture = useMemo(
    () => makeProceduralTexture(planet.id, planet.type, planet.color, planet.secondaryColor),
    [planet.id, planet.type, planet.color, planet.secondaryColor]
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    angleRef.current += delta * planet.orbitSpeed * speedMultiplier;
    groupRef.current.position.x = Math.cos(angleRef.current) * planet.orbitRadius;
    groupRef.current.position.z = Math.sin(angleRef.current) * planet.orbitRadius;
    // Write live position for camera tracking
    if (selectedPosRef) selectedPosRef.current = groupRef.current.position.clone();
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (planet.type === "gaseous" ? 0.15 : 0.25) * speedMultiplier;
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

      <Html center position={[0, -(radius + 0.5), 0]} style={{ pointerEvents: "none" }} zIndexRange={[0, 0]}>
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
    [...planets].sort((a, b) => b.size - a.size).slice(0, 3),
    [planets]
  );
  const ranks = ["01", "02", "03"];

  return (
    <div style={{
      position: "absolute",
      bottom: "16px",
      left: "16px",
      background: "rgba(2, 8, 14, 0.88)",
      border: "1px solid rgba(0,229,255,0.2)",
      backdropFilter: "blur(12px)",
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: "200px",
      clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 6, height: 6,
        borderTop: "1px solid #00e5ff",
        borderLeft: "1px solid #00e5ff",
      }} />

      <p style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(0,229,255,0.55)",
        marginBottom: "2px",
      }}>TOP OBJECTS BY MASS</p>

      {top3.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
            color: "rgba(180,200,220,0.8)",
            transition: "color 0.15s",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e8edf2")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(180,200,220,0.8)")}
        >
          <span style={{ color: "rgba(0,229,255,0.4)", fontSize: "11px", letterSpacing: "0.08em", minWidth: "18px" }}>
            {ranks[i]}
          </span>
          <div style={{
            width: 7, height: 7,
            background: p.color,
            boxShadow: `0 0 4px ${p.color}`,
            flexShrink: 0,
          }} />
          <span style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "130px",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "14px",
            letterSpacing: "0.02em",
          }}>{p.repoName}</span>
          <span style={{
            marginLeft: "auto",
            color: "rgba(0,229,255,0.5)",
            fontSize: "12px",
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}>{p.stars}</span>
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
  const [showLegend, setShowLegend] = useState(false);

  function handlePlanetClick(planet: Planet, pos: THREE.Vector3) {
    void pos;
    setSelectedPlanet((prev) => prev?.id === planet.id ? null : planet);
  }

  function handleRankingSelect(planet: Planet) {
    setSelectedPlanet(planet);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const planets = system.planets;
      if (e.key === "Escape") {
        setSelectedPlanet(null);
      } else if (e.key === "ArrowRight" || e.key === "Tab") {
        e.preventDefault();
        if (!planets.length) return;
        setSelectedPlanet((prev) => {
          if (!prev) return planets[0];
          const i = planets.findIndex(p => p.id === prev.id);
          return planets[(i + 1) % planets.length];
        });
      } else if (e.key === "ArrowLeft") {
        if (!planets.length) return;
        setSelectedPlanet((prev) => {
          if (!prev) return planets[planets.length - 1];
          const i = planets.findIndex(p => p.id === prev.id);
          return planets[(i - 1 + planets.length) % planets.length];
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [system.planets]);

  return (
    <div className="relative w-full h-[calc(100vh-110px)] min-h-[500px]">
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
      <div style={{
        position: "absolute",
        top: "16px",
        left: "16px",
        background: "rgba(2, 8, 14, 0.88)",
        border: "1px solid rgba(0,229,255,0.2)",
        backdropFilter: "blur(12px)",
        padding: "12px 14px",
        maxWidth: "240px",
        clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: 6, height: 6,
          borderTop: "1px solid #00e5ff",
          borderLeft: "1px solid #00e5ff",
        }} />

        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(0,229,255,0.55)",
          marginBottom: "8px",
        }}>STELLAR OBJECT</div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <div style={{
            width: 8, height: 8,
            background: system.star.color,
            boxShadow: `0 0 8px ${system.star.color}`,
            borderRadius: "50%",
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "15px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#e8edf2",
          }}>{system.star.name ?? system.star.username}</span>
        </div>

        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color: "rgba(140,160,180,0.8)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}>
          {system.star.dominantLanguage && (
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{ color: "rgba(0,229,255,0.5)", minWidth: "50px" }}>LANG</span>
              <span>{system.star.dominantLanguage}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ color: "rgba(0,229,255,0.5)", minWidth: "50px" }}>BODIES</span>
            <span>{system.planets.length}</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ color: "rgba(0,229,255,0.5)", minWidth: "50px" }}>FOLLOWERS</span>
            <span>{system.star.followers.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Controls panel */}
      <div style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        background: "rgba(2, 8, 14, 0.88)",
        border: "1px solid rgba(0,229,255,0.2)",
        backdropFilter: "blur(12px)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "170px",
        clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: 6, height: 6,
          borderTop: "1px solid #00e5ff",
          borderLeft: "1px solid #00e5ff",
        }} />

        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(0,229,255,0.55)",
        }}>NAVIGATION</div>

        <button
          onClick={() => setShowOrbits((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: showOrbits ? "rgba(0,229,255,0.8)" : "rgba(140,160,180,0.5)",
            textAlign: "left",
            transition: "color 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{
            display: "inline-block",
            width: 8, height: 8,
            border: "1px solid currentColor",
            borderRadius: "50%",
            position: "relative",
          }}>
            {showOrbits && <span style={{
              position: "absolute",
              inset: 2,
              background: "#00e5ff",
              borderRadius: "50%",
            }} />}
          </span>
          {showOrbits ? "ORBITS ON" : "ORBITS OFF"}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            <span style={{ color: "rgba(0,229,255,0.5)" }}>WARP</span>
            <span style={{ color: "#e8edf2", fontWeight: 600 }}>{speedMultiplier.toFixed(1)}x</span>
          </div>
          <input
            type="range" min={0.2} max={8} step={0.1} value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>

        <button
          onClick={() => setShowLegend((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: showLegend ? "rgba(0,229,255,0.8)" : "rgba(140,160,180,0.5)",
            textAlign: "left",
            transition: "color 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onMouseEnter={(e) => { if (!showLegend) e.currentTarget.style.color = "rgba(180,200,220,0.8)"; }}
          onMouseLeave={(e) => { if (!showLegend) e.currentTarget.style.color = "rgba(140,160,180,0.5)"; }}
        >
          <span style={{
            display: "inline-block",
            width: 8, height: 8,
            border: "1px solid currentColor",
            position: "relative",
          }}>
            {showLegend && <span style={{ position: "absolute", inset: 2, background: "#00e5ff" }} />}
          </span>
          LEGEND
        </button>
      </div>

      {/* Ranking */}
      <RankingPanel planets={system.planets} onSelect={handleRankingSelect} />

      {/* Hover tooltip */}
      {hoveredPlanet && !selectedPlanet && <PlanetTooltip planet={hoveredPlanet} />}

      {/* Sidebar — selected planet detail */}
      <PlanetSidebar planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />

      {/* Legend panel */}
      <LegendPanel visible={showLegend} onClose={() => setShowLegend(false)} />
    </div>
  );
}
