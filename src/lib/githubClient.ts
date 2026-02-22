import { GitHubUser, GitHubRepo, GitHubLanguages } from "@/types";

const BASE_URL = "https://api.github.com";

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: headers(),
    next: { revalidate: 300 }, // cache 5 minutes
  });

  if (res.status === 404) throw new Error("NOT_FOUND");
  if (res.status === 403) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`GITHUB_ERROR_${res.status}`);

  return res.json() as Promise<T>;
}

export async function fetchUser(username: string): Promise<GitHubUser> {
  return get<GitHubUser>(`/users/${username}`);
}

export async function fetchRepos(username: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const batch = await get<GitHubRepo[]>(
      `/users/${username}/repos?sort=pushed&per_page=100&page=${page}`
    );
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 5) break; // cap at 500 repos
  }

  return repos;
}

export async function fetchLanguages(
  fullName: string
): Promise<GitHubLanguages> {
  return get<GitHubLanguages>(`/repos/${fullName}/languages`);
}
