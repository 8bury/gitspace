import fs from "fs/promises";
import path from "path";
import { GalaxyEntry, SolarSystem } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "galaxy.json");
const TMP_PATH = path.join(DATA_DIR, "galaxy.json.tmp");

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const D1_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const D1_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

interface GalaxyStore {
  entries: Record<string, GalaxyEntry>;
}

interface D1QueryResultRow {
  username: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  star_color: string;
  dominant_language: string | null;
  followers: number;
  planet_count: number;
  brightness_score: number;
  top_planet_colors: string;
  saved_at: string;
}

interface D1Response {
  success?: boolean;
  errors?: unknown[];
  result?: Array<{
    success?: boolean;
    results?: unknown[];
  }> | {
    success?: boolean;
    results?: unknown[];
  };
}

const isD1Configured =
  Boolean(D1_ACCOUNT_ID) &&
  Boolean(D1_DATABASE_ID) &&
  Boolean(D1_API_TOKEN);

let d1InitPromise: Promise<void> | null = null;

// Serializes all writes to avoid concurrent corruption
let writeLock: Promise<void> = Promise.resolve();

function d1Endpoint(): string {
  return `${CLOUDFLARE_API_BASE}/accounts/${D1_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
}

function d1Headers(): HeadersInit {
  return {
    Authorization: `Bearer ${D1_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function d1Query<T = unknown>(
  sql: string,
  params: Array<string | number | null> = []
): Promise<T[]> {
  if (!isD1Configured) return [];

  const res = await fetch(d1Endpoint(), {
    method: "POST",
    headers: d1Headers(),
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`D1_HTTP_${res.status}`);
  }

  const payload = (await res.json()) as D1Response;

  if (payload.success === false || (payload.errors && payload.errors.length > 0)) {
    throw new Error("D1_QUERY_FAILED");
  }

  const resultContainer = Array.isArray(payload.result)
    ? payload.result[0]
    : payload.result;

  if (!resultContainer) return [];
  if (resultContainer.success === false) throw new Error("D1_QUERY_FAILED");

  return (resultContainer.results ?? []) as T[];
}

function mapD1RowToEntry(row: D1QueryResultRow): GalaxyEntry {
  let colors: string[] = [];
  try {
    const parsed = JSON.parse(row.top_planet_colors);
    if (Array.isArray(parsed)) {
      colors = parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // Keep empty colors if JSON parsing fails.
  }

  return {
    username: row.username,
    name: row.name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    starColor: row.star_color,
    dominantLanguage: row.dominant_language,
    followers: Number(row.followers) || 0,
    planetCount: Number(row.planet_count) || 0,
    brightnessScore: Number(row.brightness_score) || 0,
    topPlanetColors: colors,
    savedAt: row.saved_at,
  };
}

async function ensureD1Schema(): Promise<void> {
  if (!isD1Configured) return;
  if (!d1InitPromise) {
    d1InitPromise = d1Query(`
      CREATE TABLE IF NOT EXISTS galaxy_entries (
        username TEXT PRIMARY KEY,
        name TEXT,
        avatar_url TEXT NOT NULL,
        bio TEXT,
        star_color TEXT NOT NULL,
        dominant_language TEXT,
        followers INTEGER NOT NULL,
        planet_count INTEGER NOT NULL,
        brightness_score REAL NOT NULL,
        top_planet_colors TEXT NOT NULL,
        saved_at TEXT NOT NULL
      );
    `).then(() => undefined);
  }
  await d1InitPromise;
}

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
  if (isD1Configured) {
    await ensureD1Schema();
    const rows = await d1Query<D1QueryResultRow>(`
      SELECT
        username,
        name,
        avatar_url,
        bio,
        star_color,
        dominant_language,
        followers,
        planet_count,
        brightness_score,
        top_planet_colors,
        saved_at
      FROM galaxy_entries
      ORDER BY followers DESC, saved_at DESC;
    `);
    return rows.map(mapD1RowToEntry);
  }

  const store = await readStore();
  return Object.values(store.entries).sort((a, b) => b.followers - a.followers);
}

export async function upsertEntry(entry: GalaxyEntry): Promise<void> {
  if (isD1Configured) {
    await ensureD1Schema();
    await d1Query(
      `
      INSERT INTO galaxy_entries (
        username,
        name,
        avatar_url,
        bio,
        star_color,
        dominant_language,
        followers,
        planet_count,
        brightness_score,
        top_planet_colors,
        saved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        name = excluded.name,
        avatar_url = excluded.avatar_url,
        bio = excluded.bio,
        star_color = excluded.star_color,
        dominant_language = excluded.dominant_language,
        followers = excluded.followers,
        planet_count = excluded.planet_count,
        brightness_score = excluded.brightness_score,
        top_planet_colors = excluded.top_planet_colors,
        saved_at = excluded.saved_at;
      `,
      [
        entry.username,
        entry.name,
        entry.avatarUrl,
        entry.bio ?? null,
        entry.starColor,
        entry.dominantLanguage,
        entry.followers,
        entry.planetCount,
        entry.brightnessScore,
        JSON.stringify(entry.topPlanetColors),
        entry.savedAt,
      ]
    );
    return;
  }

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
