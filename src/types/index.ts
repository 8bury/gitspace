export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  pushed_at: string;
  size: number;
  topics: string[];
  html_url: string;
}

export interface GitHubLanguages {
  [language: string]: number; // bytes of code
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string | null;
    } | null;
  };
  author: {
    login: string;
  } | null;
}

export interface RepoCommitPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface RepoCommitActivity {
  owner: string;
  repo: string;
  windowDays: number;
  totalCommits: number;
  newestCommitAt: string | null;
  oldestCommitAt: string | null;
  points: RepoCommitPoint[];
}

// Domain types

export type PlanetType = "rocky" | "gaseous" | "icy";

export interface Star {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  dominantLanguage: string | null;
  color: string; // hex color based on dominant language
  followers: number;
  size: number; // normalized star radius
}

export interface Planet {
  id: number;
  repoName: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  languages: GitHubLanguages;
  htmlUrl: string;
  topics: string[];

  // Visual properties
  type: PlanetType;
  size: number;          // normalized 0–1
  color: string;         // hex — dominant language
  secondaryColor: string; // hex — second language (for mixed surface)
  hasRing: boolean;
  hasMoon: boolean;      // true when forks >= MOON_FORK_THRESHOLD
  axialTilt: number;     // radians, deterministic per planet
  orbitRadius: number;   // distance from star
  orbitSpeed: number;    // radians per second
  activityScore: number; // proxy for commit frequency
}

export interface SolarSystem {
  star: Star;
  planets: Planet[];
  generatedAt: string;
}

export interface GalaxyEntry {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio?: string | null;         // optional — not present in old stored entries
  starColor: string;           // color of dominant language
  dominantLanguage: string | null;
  followers: number;           // determines size in galaxy
  planetCount: number;         // number of mini orbits
  brightnessScore: number;     // 0–1, avg activityScore of planets
  topPlanetColors: string[];   // up to 3 colors of most active planets
  savedAt: string;             // ISO — when saved
}
