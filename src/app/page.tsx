"use client";

import { useState, useEffect } from "react";
import { SolarSystem, GalaxyEntry } from "@/types";
import SearchBar from "@/components/ui/SearchBar";
import SolarSystemView from "@/components/solar/SolarSystemView";
import dynamic from "next/dynamic";

const GalaxyView = dynamic(() => import("@/components/galaxy/GalaxyView"), { ssr: false });

type ViewState =
  | { mode: "galaxy" }
  | { mode: "loading-solar"; username: string }
  | { mode: "solar"; system: SolarSystem };

export default function Home() {
  const [view, setView] = useState<ViewState>({ mode: "galaxy" });
  const [galaxyEntries, setGalaxyEntries] = useState<GalaxyEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load galaxy entries on mount
  useEffect(() => {
    fetch("/api/galaxy")
      .then((r) => r.json())
      .then((data) => {
        if (data.entries) setGalaxyEntries(data.entries as GalaxyEntry[]);
      })
      .catch(() => {/* galaxy fetch failure is non-critical */});
  }, []);

  async function loadSolar(username: string) {
    setError(null);
    setView({ mode: "loading-solar", username });

    try {
      const res = await fetch(`/api/github/${encodeURIComponent(username)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setView({ mode: "galaxy" });
        return;
      }

      const system = data as SolarSystem;
      setView({ mode: "solar", system });

      // Optimistic update: add/replace entry in galaxy list
      const newEntry: GalaxyEntry = {
        username: system.star.username,
        name: system.star.name,
        avatarUrl: system.star.avatarUrl,
        bio: system.star.bio,
        starColor: system.star.color,
        dominantLanguage: system.star.dominantLanguage,
        followers: system.star.followers,
        planetCount: system.planets.length,
        brightnessScore:
          system.planets.length > 0
            ? system.planets.reduce((s, p) => s + p.activityScore, 0) / system.planets.length
            : 0,
        topPlanetColors: [...system.planets]
          .sort((a, b) => b.activityScore - a.activityScore)
          .slice(0, 3)
          .map((p) => p.color),
        savedAt: new Date().toISOString(),
      };

      setGalaxyEntries((prev) => {
        const filtered = prev.filter((e) => e.username !== newEntry.username);
        return [newEntry, ...filtered].sort((a, b) => b.followers - a.followers);
      });
    } catch {
      setError("Failed to reach the server. Check your connection.");
      setView({ mode: "galaxy" });
    }
  }

  const handleSearch = (username: string) => loadSolar(username);
  const handleGalaxyClick = (username: string) => loadSolar(username);
  const handleBack = () => { setError(null); setView({ mode: "galaxy" }); };

  const isLoading = view.mode === "loading-solar";

  return (
    <main
      className="min-h-screen bg-black text-white flex flex-col"
      style={{ fontFamily: "var(--font-display)" }}
    >
      <header className="flex flex-col items-center justify-center pt-14 pb-6 gap-3 relative">
        {/* Top decorative line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)" }}
        />

        <div className="flex items-center gap-3 mb-1">
          {/* Logo mark */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-90">
            <circle cx="14" cy="14" r="4" fill="#00e5ff" opacity="0.9" />
            <ellipse cx="14" cy="14" rx="12" ry="5" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.5" transform="rotate(-20 14 14)" />
            <ellipse cx="14" cy="14" rx="12" ry="5" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.25" transform="rotate(40 14 14)" />
            <circle cx="14" cy="14" r="13" stroke="#00e5ff" strokeWidth="0.5" fill="none" opacity="0.2" />
          </svg>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.2rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#e8edf2" }}>GIT</span>
            <span style={{ color: "#00e5ff", textShadow: "0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.2)" }}>
              SPACE
            </span>
          </h1>
        </div>

        {/* Back button — only in solar mode */}
        {view.mode === "solar" && (
          <button
            onClick={handleBack}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(0,229,255,0.6)",
              background: "transparent",
              border: "1px solid rgba(0,229,255,0.2)",
              padding: "4px 12px",
              cursor: "pointer",
              borderRadius: "2px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#00e5ff";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,229,255,0.6)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.2)";
            }}
          >
            ← GALAXY
          </button>
        )}

        <div className="mt-2">
          <SearchBar onSearch={handleSearch} loading={isLoading} />
        </div>

        {error && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: "#ff4466",
              marginTop: "4px",
            }}
          >
            ERR &gt; {error}
          </p>
        )}

        {/* Bottom decorative line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)" }}
        />
      </header>

      <section className="flex-1 w-full">
        {view.mode === "solar" && <SolarSystemView system={view.system} />}

        {view.mode === "loading-solar" && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div style={{ position: "relative", width: 40, height: 40 }}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                style={{ animation: "spin 2s linear infinite" }}
              >
                <circle cx="20" cy="20" r="18" stroke="rgba(0,229,255,0.15)" strokeWidth="1" />
                <path d="M 20 2 A 18 18 0 0 1 38 20" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.18em",
                color: "#00e5ff",
                textTransform: "uppercase",
              }}
            >
              SCANNING REPOSITORIES...
            </span>
          </div>
        )}

        {view.mode === "galaxy" && (
          <div style={{ width: "100%", height: "calc(100vh - 160px)" }}>
            <GalaxyView entries={galaxyEntries} onSystemClick={handleGalaxyClick} />
          </div>
        )}
      </section>
    </main>
  );
}
