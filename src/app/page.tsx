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
  const [focusedUsername, setFocusedUsername] = useState<string | null>(null);
  const [systemCache, setSystemCache] = useState<Map<string, SolarSystem>>(new Map());

  useEffect(() => {
    fetch("/api/galaxy")
      .then((r) => r.json())
      .then((data) => {
        if (data.entries) setGalaxyEntries(data.entries as GalaxyEntry[]);
      })
      .catch(() => {/* non-critical */});
  }, []);

  async function loadSolar(username: string, goToSolar: boolean) {
    setError(null);
    if (goToSolar) setView({ mode: "loading-solar", username });

    try {
      const res = await fetch(`/api/github/${encodeURIComponent(username)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setView({ mode: "galaxy" });
        return;
      }

      const system = data as SolarSystem;

      // Cache the full system
      setSystemCache((prev) => new Map(prev).set(username, system));

      // Build and upsert galaxy entry
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

      if (goToSolar) {
        setView({ mode: "solar", system });
      } else {
        setView({ mode: "galaxy" });
        setFocusedUsername(username);
      }
    } catch {
      setError("Failed to reach the server. Check your connection.");
      setView({ mode: "galaxy" });
    }
  }

  function handleExplore(username: string) {
    const cached = systemCache.get(username);
    const entry = galaxyEntries.find((e) => e.username === username);
    const fresh =
      entry && Date.now() - new Date(entry.savedAt).getTime() < 12 * 3600 * 1000;

    if (cached && fresh) {
      setView({ mode: "solar", system: cached });
      setFocusedUsername(null);
    } else {
      loadSolar(username, true);
    }
  }

  const handleSearch = (username: string) => loadSolar(username, false);
  const handleBack = () => { setError(null); setFocusedUsername(null); setView({ mode: "galaxy" }); };

  const isLoading = view.mode === "loading-solar";

  return (
    <main
      className="min-h-screen bg-black text-white flex flex-col"
      style={{ fontFamily: "var(--font-display)" }}
    >
      <header className="relative flex flex-col items-center justify-center gap-2 px-3 pt-3 pb-3 lg:min-h-[92px]">
        {/* Top decorative line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)" }}
        />

        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-90">
            <circle cx="14" cy="14" r="4" fill="#00e5ff" opacity="0.9" />
            <ellipse cx="14" cy="14" rx="12" ry="5" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.5" transform="rotate(-20 14 14)" />
            <ellipse cx="14" cy="14" rx="12" ry="5" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.25" transform="rotate(40 14 14)" />
            <circle cx="14" cy="14" r="13" stroke="#00e5ff" strokeWidth="0.5" fill="none" opacity="0.2" />
          </svg>

          <h1
            className="text-[1.7rem] sm:text-[2rem] lg:text-[2.2rem]"
            style={{
              fontFamily: "var(--font-display)",
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

        <a
          href="https://github.com/8bury/gitspace"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Are you enjoying GitSpace? Consider leaving a star."
          className="inline-flex max-w-[230px] items-center gap-2 text-left lg:absolute lg:top-1/2 lg:right-4 lg:-translate-y-1/2"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.06em",
            color: "rgba(225,246,255,0.92)",
            background: "linear-gradient(180deg, rgba(0,229,255,0.14), rgba(2,8,14,0.82))",
            border: "1px solid rgba(0,229,255,0.35)",
            padding: "7px 10px",
            textDecoration: "none",
            borderRadius: "4px",
            transition: "all 0.18s",
            backdropFilter: "blur(10px)",
            boxShadow: "0 0 0 1px rgba(0,229,255,0.08) inset, 0 0 14px rgba(0,229,255,0.14)",
            zIndex: 10,
            lineHeight: 1.25,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "#f0fdff";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,229,255,0.6)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 1px rgba(0,229,255,0.14) inset, 0 0 22px rgba(0,229,255,0.26)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "rgba(225,246,255,0.92)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,229,255,0.35)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 1px rgba(0,229,255,0.08) inset, 0 0 14px rgba(0,229,255,0.14)";
          }}
        >
          <span style={{ color: "#00e5ff", fontSize: "12px", lineHeight: 1 }}>★</span>
          <span>
            Are you enjoying GitSpace?
            <br />
            Consider leaving a star.
          </span>
        </a>

        {/* Back button — only in solar mode */}
        {view.mode === "solar" && (
          <button
            onClick={handleBack}
            className="lg:absolute lg:top-1/2 lg:left-4 lg:-translate-y-1/2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(0,229,255,0.7)",
              background: "rgba(2, 8, 14, 0.72)",
              border: "1px solid rgba(0,229,255,0.22)",
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: "2px",
              transition: "all 0.15s",
              backdropFilter: "blur(8px)",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#00e5ff";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,229,255,0.7)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.22)";
            }}
          >
            ← GALAXY
          </button>
        )}

        <div className="w-full flex justify-center">
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

        {view.mode !== "solar" && (
          <div style={{ width: "100%", height: "calc(100vh - 110px)" }}>
            <GalaxyView
              entries={galaxyEntries}
              onSystemExplore={handleExplore}
              focusedUsername={focusedUsername}
            />
          </div>
        )}
      </section>
    </main>
  );
}
