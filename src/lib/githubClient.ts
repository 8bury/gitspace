import { GitHubUser, GitHubRepo, GitHubLanguages, GitHubCommit } from "@/types";

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

interface FetchRepoCommitsOptions {
  since?: string;
  perPage?: number;
  maxPages?: number;
}

export async function fetchRepoCommits(
  owner: string,
  repo: string,
  options: FetchRepoCommitsOptions = {}
): Promise<GitHubCommit[]> {
  const { since, perPage = 100, maxPages = 3 } = options;
  const commits: GitHubCommit[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
    });

    if (since) params.set("since", since);

    try {
      const batch = await get<GitHubCommit[]>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${params.toString()}`
      );

      commits.push(...batch);
      if (batch.length < perPage) break;
    } catch (err) {
      if (err instanceof Error && err.message === "GITHUB_ERROR_409") {
        // Empty repository or no default branch yet.
        return [];
      }
      throw err;
    }
  }

  return commits;
}
