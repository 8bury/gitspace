"use client";

import { useState } from "react";
import { SolarSystem } from "@/types";
import SearchBar from "@/components/ui/SearchBar";
import SolarSystemView from "@/components/solar/SolarSystemView";

export default function Home() {
  const [system, setSystem] = useState<SolarSystem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(username: string) {
    setLoading(true);
    setError(null);
    setSystem(null);

    try {
      const res = await fetch(`/api/github/${encodeURIComponent(username)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setSystem(data as SolarSystem);
    } catch {
      setError("Failed to reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "var(--font-display)" }}>
      <header className="flex flex-col items-center justify-center pt-14 pb-6 gap-3 relative">
        {/* Decorative line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)" }} />

        <div className="flex items-center gap-3 mb-1">
          {/* Logo mark */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-90">
            <circle cx="14" cy="14" r="4" fill="#00e5ff" opacity="0.9"/>
            <ellipse cx="14" cy="14" rx="12" ry="5" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.5" transform="rotate(-20 14 14)"/>
            <ellipse cx="14" cy="14" rx="12" ry="5" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.25" transform="rotate(40 14 14)"/>
            <circle cx="14" cy="14" r="13" stroke="#00e5ff" strokeWidth="0.5" fill="none" opacity="0.2"/>
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
            <span style={{ color: "#00e5ff", textShadow: "0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.2)" }}>SPACE</span>
          </h1>
        </div>

        <div className="mt-2">
          <SearchBar onSearch={handleSearch} loading={loading} />
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
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)" }} />
      </header>

      <section className="flex-1 w-full">
        {system ? (
          <SolarSystemView system={system} />
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.2">
                <circle cx="20" cy="20" r="3" fill="#00e5ff"/>
                <circle cx="20" cy="20" r="18" stroke="#00e5ff" strokeWidth="0.5"/>
                <ellipse cx="20" cy="20" rx="18" ry="7" stroke="#00e5ff" strokeWidth="0.5" fill="none" transform="rotate(30 20 20)"/>
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  color: "rgba(80,100,120,0.6)",
                  textTransform: "uppercase",
                }}
              >
                AWAITING TARGET COORDINATES
              </span>
            </div>
          )
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div style={{ position: "relative", width: 40, height: 40 }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ animation: "spin 2s linear infinite" }}>
                <circle cx="20" cy="20" r="18" stroke="rgba(0,229,255,0.15)" strokeWidth="1"/>
                <path d="M 20 2 A 18 18 0 0 1 38 20" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="square"/>
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
                animation: "blink-cursor 1.2s step-end infinite",
              }}
            >
              SCANNING REPOSITORIES...
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
