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
  size: number;        // normalized 0–1
  color: string;       // hex
  hasRing: boolean;
  orbitRadius: number; // distance from star
  orbitSpeed: number;  // radians per second
  activityScore: number; // proxy for commit frequency
}

export interface SolarSystem {
  star: Star;
  planets: Planet[];
  generatedAt: string;
}
