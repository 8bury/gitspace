import { GitHubUser, GitHubRepo, GitHubLanguages, SolarSystem, Star, Planet, PlanetType } from "@/types";
import { getLanguageColor } from "./languageColors";

// Thresholds (configurable)
const RING_STAR_THRESHOLD = 50;
const MOON_FORK_THRESHOLD = 10;
const GAS_GIANT_STAR_RATIO = 3; // stars-per-activity score to be gaseous

function activityScore(repo: GitHubRepo): number {
  const now = Date.now();
  const pushedMs = new Date(repo.pushed_at).getTime();
  const daysSincePush = (now - pushedMs) / (1000 * 60 * 60 * 24);

  // Recency factor: repos pushed recently score higher
  const recency = Math.max(0, 1 - daysSincePush / 365);
  // Size as a lightweight proxy for commit volume
  const sizeScore = Math.log10(Math.max(repo.size, 1)) / 5;

  return recency * 0.7 + sizeScore * 0.3;
}

function determinePlanetType(stars: number, activity: number): PlanetType {
  if (stars === 0 && activity === 0) return "icy";
  const ratio = stars / Math.max(activity, 0.01);
  if (ratio > GAS_GIANT_STAR_RATIO) return "gaseous";
  return "rocky";
}

function dominantLanguage(languages: GitHubLanguages): string | null {
  const entries = Object.entries(languages);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function secondLanguageColor(languages: GitHubLanguages, dominant: string | null): string {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const second = entries.find(([lang]) => lang !== dominant);
  return getLanguageColor(second?.[0] ?? null);
}

function normalizeSizes(planets: { size: number }[]): void {
  const max = Math.max(...planets.map((p) => p.size), 1);
  for (const p of planets) {
    p.size = p.size / max;
  }
}

export function buildSolarSystem(
  user: GitHubUser,
  repos: GitHubRepo[],
  languagesMap: Map<number, GitHubLanguages>
): SolarSystem {
  // Sort repos by pushed_at desc, limit to 40 for visual clarity
  const sorted = [...repos]
    .filter((r) => !r.name.includes(".github.io") || repos.length <= 10)
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, 40);

  // Determine star color from most recently active repo language
  const recentLanguages = sorted
    .slice(0, 10)
    .map((r) => r.language)
    .filter(Boolean) as string[];

  const langFreq: Record<string, number> = {};
  for (const l of recentLanguages) langFreq[l] = (langFreq[l] ?? 0) + 1;
  const starLang = Object.entries(langFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const star: Star = {
    username: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    dominantLanguage: starLang,
    color: getLanguageColor(starLang),
    followers: user.followers,
    size: Math.min(1 + Math.log10(Math.max(user.followers, 1)) * 0.25, 2.2),
  };

  const planets: Planet[] = sorted.map((repo, i) => {
    const langs = languagesMap.get(repo.id) ?? {};
    const domLang = dominantLanguage(langs) ?? repo.language;
    const activity = activityScore(repo);
    const type = determinePlanetType(repo.stargazers_count, activity);

    // Size: rocky by activity, gaseous by stars
    const rawSize =
      type === "gaseous"
        ? Math.log10(repo.stargazers_count + 1) * 0.5 + activity * 0.2
        : activity * 0.7 + Math.log10(repo.size + 1) * 0.1;

    return {
      id: repo.id,
      repoName: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: domLang,
      languages: langs,
      htmlUrl: repo.html_url,
      topics: repo.topics ?? [],
      type,
      size: Math.max(rawSize, 0.05),
      color: getLanguageColor(domLang),
      secondaryColor: secondLanguageColor(langs, domLang),
      hasRing: repo.stargazers_count >= RING_STAR_THRESHOLD,
      hasMoon: repo.forks_count >= MOON_FORK_THRESHOLD,
      axialTilt: ((repo.id * 1.618) % 1) * 0.6, // deterministic 0–0.6 rad
      orbitRadius: 3 + i * 1.2,
      orbitSpeed: 0.05 / (1 + i * 0.15),
      activityScore: activity,
    };
  });

  normalizeSizes(planets);

  return {
    star,
    planets,
    generatedAt: new Date().toISOString(),
  };
}
