import { NextRequest, NextResponse } from "next/server";
import { fetchRepoCommits } from "@/lib/githubClient";
import { RepoCommitActivity, RepoCommitPoint } from "@/types";

const WINDOW_DAYS = 21;
const MAX_PAGES = 4;

function isValidUsername(username: string): boolean {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username);
}

function isValidRepoName(repo: string): boolean {
  return /^[a-z\d._-]{1,100}$/i.test(repo);
}

function toIsoDateDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildWindowDays(now: Date, windowDays: number): string[] {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));

  const days: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    days.push(toIsoDateDay(day));
  }

  return days;
}

function emptyActivity(owner: string, repo: string, windowDays: string[]): RepoCommitActivity {
  return {
    owner,
    repo,
    windowDays: windowDays.length,
    totalCommits: 0,
    newestCommitAt: null,
    oldestCommitAt: null,
    points: windowDays.map((day) => ({ date: day, count: 0 })),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; repo: string }> }
) {
  const { username: rawUsername, repo: rawRepo } = await params;
  let username = "";
  let repo = "";

  try {
    username = decodeURIComponent(rawUsername ?? "");
    repo = decodeURIComponent(rawRepo ?? "");
  } catch {
    return NextResponse.json(
      { error: "Invalid username or repository name" },
      { status: 400 }
    );
  }

  if (!isValidUsername(username) || !isValidRepoName(repo)) {
    return NextResponse.json(
      { error: "Invalid username or repository name" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const windowDays = buildWindowDays(now, WINDOW_DAYS);
    const start = new Date(`${windowDays[0]}T00:00:00.000Z`);

    const commits = await fetchRepoCommits(username, repo, {
      since: start.toISOString(),
      maxPages: MAX_PAGES,
    });

    const countsByDay = new Map<string, number>(
      windowDays.map((day) => [day, 0] as const)
    );
    let newestCommitAt: string | null = null;
    let oldestCommitAt: string | null = null;

    for (const commit of commits) {
      const date = commit.commit.author?.date;
      if (!date) continue;

      const day = date.slice(0, 10);
      if (!countsByDay.has(day)) continue;

      countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);

      if (!newestCommitAt || date > newestCommitAt) newestCommitAt = date;
      if (!oldestCommitAt || date < oldestCommitAt) oldestCommitAt = date;
    }

    const points: RepoCommitPoint[] = windowDays.map((day) => ({
      date: day,
      count: countsByDay.get(day) ?? 0,
    }));
    const totalCommits = points.reduce((sum, point) => sum + point.count, 0);

    const payload: RepoCommitActivity = {
      owner: username,
      repo,
      windowDays: WINDOW_DAYS,
      totalCommits,
      newestCommitAt,
      oldestCommitAt,
      points,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const fallbackDays = buildWindowDays(new Date(), WINDOW_DAYS);
    const fallbackPayload = emptyActivity(username, repo, fallbackDays);

    if (message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }
    if (message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }
    if (message === "GITHUB_ERROR_409" || message === "GITHUB_ERROR_422") {
      // Empty repository / no default branch / invalid commit window for this repo.
      return NextResponse.json(fallbackPayload);
    }
    if (message.startsWith("GITHUB_ERROR_")) {
      console.warn("[GitSpace API][Commits][Fallback]", message);
      return NextResponse.json(fallbackPayload);
    }

    console.error("[GitSpace API][Commits]", message);
    return NextResponse.json(fallbackPayload);
  }
}
