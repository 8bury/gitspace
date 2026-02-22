import fs from "fs/promises";
import path from "path";
import { GalaxyEntry, SolarSystem } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "galaxy.json");
const TMP_PATH = path.join(DATA_DIR, "galaxy.json.tmp");

interface GalaxyStore {
  entries: Record<string, GalaxyEntry>;
}

// Serializes all writes to avoid concurrent corruption
let writeLock: Promise<void> = Promise.resolve();

async function readStore(): Promise<GalaxyStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as GalaxyStore;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { entries: {} };
    }
    throw err;
  }
}

async function writeStore(store: GalaxyStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(store, null, 2), "utf-8");
  await fs.rename(TMP_PATH, STORE_PATH);
}

export async function getAllEntries(): Promise<GalaxyEntry[]> {
  const store = await readStore();
  return Object.values(store.entries).sort((a, b) => b.followers - a.followers);
}

export async function upsertEntry(entry: GalaxyEntry): Promise<void> {
  writeLock = writeLock.then(async () => {
    const store = await readStore();
    store.entries[entry.username] = entry;
    await writeStore(store);
  });
  await writeLock;
}

export function extractGalaxyEntry(system: SolarSystem): GalaxyEntry {
  const { star, planets } = system;

  const brightnessScore =
    planets.length > 0
      ? planets.reduce((sum, p) => sum + p.activityScore, 0) / planets.length
      : 0;

  const topPlanetColors = [...planets]
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 3)
    .map((p) => p.color);

  return {
    username: star.username,
    name: star.name,
    avatarUrl: star.avatarUrl,
    bio: star.bio,
    starColor: star.color,
    dominantLanguage: star.dominantLanguage,
    followers: star.followers,
    planetCount: planets.length,
    brightnessScore: Math.min(1, brightnessScore),
    topPlanetColors,
    savedAt: new Date().toISOString(),
  };
}
