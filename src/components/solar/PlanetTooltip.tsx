import { Planet } from "@/types";

export default function PlanetTooltip({ planet }: { planet: Planet }) {
  return (
    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm border border-zinc-800 rounded-xl px-3 py-2 text-xs pointer-events-none">
      <div className="flex items-center gap-2 font-medium mb-1">
        <div className="w-2 h-2 rounded-full" style={{ background: planet.color }} />
        {planet.repoName}
      </div>
      <div className="text-zinc-400 space-y-0.5">
        <div>⭐ {planet.stars} · 🍴 {planet.forks}</div>
        {planet.language && <div>💻 {planet.language}</div>}
        <div className="capitalize">Type: {planet.type}</div>
      </div>
    </div>
  );
}
