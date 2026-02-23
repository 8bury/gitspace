"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GalaxyEntry } from "@/types";
import { GalaxyPosition, computeGalaxyLayout } from "@/lib/galaxyLayout";
import MiniSolarSystem from "./MiniSolarSystem";

interface Props {
  entries: GalaxyEntry[];
  onSystemExplore: (username: string) => void;
  focusedUsername?: string | null;
}

// ─── Easter egg ───────────────────────────────────────────────────────────────
const _A = "8bury";
const _B = "ju-caju";
const _PA: GalaxyPosition = { x: -62, y: 2, z: -18 };
const _PB: GalaxyPosition = { x: -50, y: 2, z: -18 };

function PairBond({ a, b }: { a: GalaxyPosition; b: GalaxyPosition }) {
  const lineRef = useRef<THREE.Line>(null!);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a.x, a.y, a.z),
    new THREE.Vector3(b.x, b.y, b.z),
  ]), [a, b]);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: "#ff88cc", transparent: true, opacity: 0.12 }), []);
  useFrame(({ clock }) => {
    if (lineRef.current) (lineRef.current.material as THREE.LineBasicMaterial).opacity =
      0.08 + Math.sin(clock.getElapsedTime() * 1.4) * 0.06;
  });
  return <primitive ref={lineRef} object={new THREE.Line(geo, mat)} />;
}

function computeFollowerSizeScales(entries: GalaxyEntry[]): number[] {
  if (entries.length === 0) return [];

  const maxFollowersForScale = 200_000;
  const minScale = 0.06;

  return entries.map((entry) => {
    const safeFollowers = Math.max(entry.followers, 0);
    const normalized = safeFollowers / maxFollowersForScale;
    return THREE.MathUtils.clamp(
      minScale + normalized * (1 - minScale),
      minScale,
      1
    );
  });
}

// ─── Camera focus + zoom ──────────────────────────────────────────────────────
function CameraFocus({
  target,
  controlsRef,
}: {
  target: [number, number, number] | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const orbitDest    = useRef(new THREE.Vector3());
  const targetRadius = useRef<number | null>(null);
  const prevKey      = useRef<string>("null");
  const dir          = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Detect target change — start one-shot zoom
    const key = target ? `${target[0].toFixed(1)},${target[2].toFixed(1)}` : "null";
    if (key !== prevKey.current) {
      prevKey.current = key;
      targetRadius.current = target ? 42 : 116;
      if (target) orbitDest.current.set(target[0], 0, target[2]);
      else        orbitDest.current.set(0, 0, 0);
    }

    // Lerp orbit pivot
    controls.target.lerp(orbitDest.current, delta * 3);

    // One-shot zoom: only shrink/grow the radius — angle is untouched
    if (targetRadius.current !== null) {
      const currentDist = camera.position.distanceTo(controls.target);
      if (currentDist > 0.001) {
        const newDist = THREE.MathUtils.lerp(currentDist, targetRadius.current, delta * 4);
        dir.copy(camera.position).sub(controls.target).normalize().multiplyScalar(newDist);
        camera.position.copy(controls.target).add(dir);
      }
      if (Math.abs(camera.position.distanceTo(controls.target) - targetRadius.current) < 0.5) {
        targetRadius.current = null; // animation done — OrbitControls is fully free
      }
    }

    controls.update();
  });
  return null;
}
// ──────────────────────────────────────────────────────────────────────────────

// ─── Info panel (HTML overlay) ────────────────────────────────────────────────
function SystemPanel({
  entry,
  onEnter,
  onClose,
  isMobile,
}: {
  entry: GalaxyEntry;
  onEnter: () => void;
  onClose: () => void;
  isMobile: boolean;
}) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        bottom: isMobile ? "calc(64px + env(safe-area-inset-bottom, 0px))" : 20,
        left: isMobile ? 8 : "auto",
        right: isMobile ? 8 : 20,
        width: isMobile ? "auto" : 280,
        maxHeight: isMobile ? "52vh" : "none",
        overflowY: isMobile ? "auto" : "visible",
        background: "rgba(2,8,14,0.92)",
        border: `1px solid ${entry.starColor}44`,
        backdropFilter: "blur(14px)",
        padding: isMobile ? "12px" : "16px",
        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
        zIndex: 30,
        pointerEvents: "auto",
        touchAction: "manipulation",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Corner accents */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderTop: `1px solid ${entry.starColor}`, borderLeft: `1px solid ${entry.starColor}` }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderBottom: `1px solid ${entry.starColor}`, borderRight: `1px solid ${entry.starColor}` }} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: `${entry.starColor}99` }}>
          SYSTEM DETECTED
        </span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "1px solid rgba(0,229,255,0.2)", padding: "2px 6px", cursor: "pointer", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em", color: "rgba(140,160,180,0.6)", transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget.style.color = "#e8edf2"); (e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)"); }}
          onMouseLeave={(e) => { (e.currentTarget.style.color = "rgba(140,160,180,0.6)"); (e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"); }}
        >
          ESC
        </button>
      </div>

      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.avatarUrl}
          alt={entry.username}
          style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${entry.starColor}66`, flexShrink: 0, objectFit: "cover" }}
        />
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "0.05em", textTransform: "uppercase", color: "#e8edf2" }}>
            {entry.name ?? entry.username}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(0,229,255,0.55)", letterSpacing: "0.06em" }}>
            @{entry.username}
          </div>
        </div>
      </div>

      {/* Bio */}
      {!isMobile && entry.bio && (
        <p style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: "rgba(140,160,180,0.75)",
          lineHeight: 1.5,
          marginBottom: 12,
          letterSpacing: "0.02em",
        }}>
          {entry.bio}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, fontFamily: "monospace", fontSize: 12 }}>
        {entry.dominantLanguage && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(0,229,255,0.5)" }}>LANGUAGE</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: entry.starColor, boxShadow: `0 0 5px ${entry.starColor}`, display: "inline-block" }} />
              <span style={{ color: "rgba(180,200,220,0.85)" }}>{entry.dominantLanguage}</span>
            </span>
          </div>
        )}
        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(0,229,255,0.5)" }}>FOLLOWERS</span>
            <span style={{ color: "rgba(180,200,220,0.85)" }}>{entry.followers.toLocaleString()}</span>
          </div>
        )}
        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(0,229,255,0.5)" }}>OBJECTS</span>
            <span style={{ color: "rgba(180,200,220,0.85)" }}>{entry.planetCount}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isMobile && (
        <div style={{
          display: "flex",
          gap: 8,
          marginTop: "auto",
        }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEnter();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEnter();
            }}
            style={{ flex: 1, background: `${entry.starColor}18`, border: `1px solid ${entry.starColor}66`, padding: "10px 0", minHeight: 40, cursor: "pointer", fontFamily: "monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: entry.starColor, transition: "all 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget.style.background = `${entry.starColor}30`); }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = `${entry.starColor}18`); }}
          >
            EXPLORE SYSTEM
          </button>
          <a
            href={`https://github.com/${entry.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", fontFamily: "monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(140,160,180,0.7)", textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#e8edf2"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(140,160,180,0.7)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            GITHUB ↗
          </a>
        </div>
      )}
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function GalaxyView({ entries, onSystemExplore, focusedUsername }: Props) {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [newlyAdded, setNewlyAdded] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const selectedEntry = entries.find((e) => e.username === selectedUsername) ?? null;

  const rawPositions = useMemo(() => computeGalaxyLayout(entries.length, 80), [entries.length]);
  const followerSizeScales = useMemo(() => computeFollowerSizeScales(entries), [entries]);

  const positions = useMemo(() => {
    const pos = [...rawPositions];
    const ia = entries.findIndex((e) => e.username === _A);
    const ib = entries.findIndex((e) => e.username === _B);
    if (ia !== -1 && ib !== -1) { pos[ia] = { ..._PA }; pos[ib] = { ..._PB }; }
    return pos;
  }, [rawPositions, entries]);

  const pairActive = entries.some((e) => e.username === _A) && entries.some((e) => e.username === _B);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-select and track newly added system
  useEffect(() => {
    if (!focusedUsername) return;

    const selectTimer = setTimeout(() => {
      setSelectedUsername(focusedUsername);
      setNewlyAdded(focusedUsername);
    }, 0);
    const clearPulseTimer = setTimeout(() => setNewlyAdded(null), 600);

    return () => {
      clearTimeout(selectTimer);
      clearTimeout(clearPulseTimer);
    };
  }, [focusedUsername]);

  // Selected system's world position for camera focus
  const selectedIdx = selectedUsername
    ? entries.findIndex((e) => e.username === selectedUsername)
    : -1;
  const selectedPos = selectedIdx >= 0
    ? [positions[selectedIdx].x, positions[selectedIdx].y, positions[selectedIdx].z] as [number, number, number]
    : null;

  function handleSelect(username: string) {
    setSelectedUsername((prev) => prev === username ? null : username);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Badge */}
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10, fontFamily: "monospace", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,229,255,0.5)", pointerEvents: "none", userSelect: "none" }}>
        {entries.length} SYSTEM{entries.length !== 1 ? "S" : ""} CATALOGUED
      </div>

      {entries.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, pointerEvents: "none", zIndex: 5 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.15">
            <circle cx="20" cy="20" r="3" fill="#00e5ff" />
            <circle cx="20" cy="20" r="18" stroke="#00e5ff" strokeWidth="0.5" />
            <ellipse cx="20" cy="20" rx="18" ry="7" stroke="#00e5ff" strokeWidth="0.5" fill="none" transform="rotate(30 20 20)" />
          </svg>
          <span style={{ fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.15em", color: "rgba(80,100,120,0.5)", textTransform: "uppercase" }}>
            SEARCH A GITHUB USER TO BEGIN
          </span>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 100, 60], fov: 55, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#000008" }}
        onPointerMissed={() => setSelectedUsername(null)}
      >
        <ambientLight intensity={0.05} />
        <Stars radius={400} depth={80} count={8000} factor={4} saturation={0} fade speed={0.3} />

        <Suspense fallback={null}>
          {entries.map((entry, i) => (
            <MiniSolarSystem
              key={entry.username}
              entry={entry}
              position={positions[i]}
              onSelect={handleSelect}
              sizeScale={followerSizeScales[i] ?? 0.06}
              isSelected={selectedUsername === entry.username}
              isNew={entry.username === newlyAdded}
            />
          ))}
          {pairActive && <PairBond a={_PA} b={_PB} />}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          minDistance={30}
          maxDistance={300}
          enablePan
          autoRotate={entries.length > 0 && !selectedUsername}
          autoRotateSpeed={0.15}
        />

        <CameraFocus target={selectedPos} controlsRef={controlsRef} />

        <EffectComposer>
          <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={1.5} mipmapBlur />
        </EffectComposer>
      </Canvas>

      {/* Info panel */}
      {selectedEntry && (
        <SystemPanel
          entry={selectedEntry}
          onEnter={() => { onSystemExplore(selectedEntry.username); setSelectedUsername(null); }}
          onClose={() => setSelectedUsername(null)}
          isMobile={isMobile}
        />
      )}

      {/* Mobile primary action */}
      {isMobile && selectedEntry && (
        <button
          onClick={() => { onSystemExplore(selectedEntry.username); setSelectedUsername(null); }}
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
            zIndex: 60,
            background: `${selectedEntry.starColor}22`,
            border: `1px solid ${selectedEntry.starColor}88`,
            color: selectedEntry.starColor,
            minHeight: 44,
            fontFamily: "monospace",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          EXPLORE SYSTEM
        </button>
      )}
    </div>
  );
}
