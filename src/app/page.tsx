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
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex flex-col items-center justify-center pt-16 pb-8 gap-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Git<span className="text-indigo-400">Space</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Your GitHub profile as a solar system
        </p>
        <SearchBar onSearch={handleSearch} loading={loading} />
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </header>

      <section className="flex-1 w-full">
        {system ? (
          <SolarSystemView system={system} />
        ) : (
          !loading && (
            <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
              Enter a GitHub username to explore the universe
            </div>
          )
        )}
        {loading && (
          <div className="flex items-center justify-center h-64 text-indigo-400 text-sm animate-pulse">
            Mapping the universe…
          </div>
        )}
      </section>
    </main>
  );
}
