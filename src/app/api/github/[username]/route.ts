import { NextRequest, NextResponse } from "next/server";
import { fetchUser, fetchRepos, fetchLanguages } from "@/lib/githubClient";
import { buildSolarSystem } from "@/lib/planetMapper";
import { GitHubLanguages } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!username || username.length > 39) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const [user, repos] = await Promise.all([
      fetchUser(username),
      fetchRepos(username),
    ]);

    // Fetch languages in parallel, cap at 30 repos to avoid rate limit
    const reposToFetch = repos.slice(0, 30);
    const languageResults = await Promise.allSettled(
      reposToFetch.map((r) => fetchLanguages(r.full_name))
    );

    const languagesMap = new Map<number, GitHubLanguages>();
    reposToFetch.forEach((repo, i) => {
      const result = languageResults[i];
      if (result.status === "fulfilled") {
        languagesMap.set(repo.id, result.value);
      }
    });

    const system = buildSolarSystem(user, repos, languagesMap);
    return NextResponse.json(system);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";

    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    console.error("[GitSpace API]", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
