"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Planet, RepoCommitActivity, RepoCommitPoint } from "@/types";

interface Props {
  planet: Planet | null;
  onClose: () => void;
}

interface RepoIdentity {
  owner: string;
  repo: string;
  key: string;
}

const CHART_WIDTH = 252;
const CHART_HEIGHT = 114;
const CHART_PADDING_X = 24;
const CHART_PADDING_Y = 12;

function formatShortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function dateLabelFromIso(date: string | null): string {
  if (!date) return "N/A";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function resolveRepoIdentity(planet: Planet): RepoIdentity | null {
  const fullNameParts = planet.fullName.split("/");
  if (fullNameParts.length === 2) {
    const owner = fullNameParts[0]?.trim();
    const repo = fullNameParts[1]?.trim();
    if (owner && repo) {
      return { owner, repo, key: `${owner}/${repo}` };
    }
  }

  try {
    const url = new URL(planet.htmlUrl);
    const owner = url.pathname.split("/")[1]?.trim();
    const repo = url.pathname.split("/")[2]?.trim();

    if (owner && repo) {
      return { owner, repo, key: `${owner}/${repo}` };
    }
  } catch {
    return null;
  }

  return null;
}

function CommitChart({ activity }: { activity: RepoCommitActivity }) {
  const points = activity.points;
  const maxCount = Math.max(...points.map((point) => point.count), 1);
  const chartInnerWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const chartInnerHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
  const baselineY = CHART_HEIGHT - CHART_PADDING_Y;
  const stepX = points.length > 1 ? chartInnerWidth / (points.length - 1) : 0;

  const getPoint = (point: RepoCommitPoint, index: number) => {
    const x = CHART_PADDING_X + index * stepX;
    const normalized = point.count / maxCount;
    const y = baselineY - normalized * chartInnerHeight;
    return { x, y };
  };

  const pathData = points
    .map((point, index) => {
      const { x, y } = getPoint(point, index);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const first = points[0] ? getPoint(points[0], 0) : { x: CHART_PADDING_X, y: baselineY };
  const last = points[points.length - 1]
    ? getPoint(points[points.length - 1], points.length - 1)
    : { x: CHART_WIDTH - CHART_PADDING_X, y: baselineY };
  const areaData = `${pathData} L${last.x.toFixed(2)} ${baselineY.toFixed(2)} L${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  const peakPoint = points.reduce<RepoCommitPoint | null>((peak, point) => {
    if (!peak || point.count > peak.count) return point;
    return peak;
  }, null);
  const yTicks = [0, 1, 2, 3].map((line) => {
    const y = CHART_PADDING_Y + (chartInnerHeight / 3) * line;
    const value = Math.round(((3 - line) / 3) * maxCount);
    return { key: line, y, value };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        aria-label="Repository commits chart"
      >
        {yTicks.map((tick) => {
          return (
            <g key={tick.key}>
              <line
                x1={CHART_PADDING_X}
                y1={tick.y}
                x2={CHART_WIDTH - CHART_PADDING_X}
                y2={tick.y}
                stroke="rgba(0,229,255,0.12)"
                strokeWidth={1}
              />
              <text
                x={2}
                y={tick.y + 3}
                fill="rgba(140,160,180,0.78)"
                fontSize={8}
                fontFamily="var(--font-mono)"
                letterSpacing="0.06em"
              >
                {tick.value}
              </text>
            </g>
          );
        })}
        <path d={areaData} fill="url(#commitsAreaGradient)" />
        <path
          d={pathData}
          fill="none"
          stroke="#00e5ff"
          strokeWidth={2}
          style={{ filter: "drop-shadow(0 0 4px rgba(0,229,255,0.8))" }}
        />
        {points.map((point, index) => {
          const { x, y } = getPoint(point, index);
          if (point.count === 0) return null;

          return (
            <circle
              key={`${point.date}-${point.count}`}
              cx={x}
              cy={y}
              r={1.8}
              fill="#9ff6ff"
              opacity={0.95}
            />
          );
        })}
        <defs>
          <linearGradient id="commitsAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,229,255,0.35)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0.02)" />
          </linearGradient>
        </defs>
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(140,160,180,0.7)",
        }}
      >
        <span>{formatShortDate(points[0]?.date ?? "")}</span>
        <span>{formatShortDate(points[points.length - 1]?.date ?? "")}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 10px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "rgba(180,200,220,0.85)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ color: "rgba(0,229,255,0.5)", letterSpacing: "0.08em" }}>TOTAL</span>
          <span>{activity.totalCommits}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ color: "rgba(0,229,255,0.5)", letterSpacing: "0.08em" }}>PEAK DAY</span>
          <span>{peakPoint?.count ?? 0}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ color: "rgba(0,229,255,0.5)", letterSpacing: "0.08em" }}>LAST COMMIT</span>
          <span>{dateLabelFromIso(activity.newestCommitAt)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ color: "rgba(0,229,255,0.5)", letterSpacing: "0.08em" }}>WINDOW</span>
          <span>{activity.windowDays} DAYS</span>
        </div>
      </div>
    </div>
  );
}

export default function PlanetSidebar({ planet, onClose }: Props) {
  const [commitCache, setCommitCache] = useState<Record<string, RepoCommitActivity>>({});
  const [commitErrors, setCommitErrors] = useState<Record<string, string>>({});

  const repoIdentity = useMemo(
    () => (planet ? resolveRepoIdentity(planet) : null),
    [planet]
  );
  const repoKey = repoIdentity?.key ?? null;
  const commitActivity = repoKey ? commitCache[repoKey] : null;
  const commitError = repoKey ? commitErrors[repoKey] ?? null : null;
  const unresolvedRepoError = planet && !repoIdentity
    ? "Unable to resolve repository identity."
    : null;
  const activeCommitError = unresolvedRepoError ?? commitError;
  const loadingCommits = Boolean(
    planet && repoIdentity && !commitActivity && !commitError
  );

  useEffect(() => {
    if (!planet || !repoIdentity || commitActivity || commitError) return;

    const controller = new AbortController();

    fetch(
      `/api/github/${encodeURIComponent(repoIdentity.owner)}/repos/${encodeURIComponent(repoIdentity.repo)}/commits`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const payload = (await res.json()) as RepoCommitActivity | { error?: string };
        if (!res.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Failed to load repository commits."
          );
        }

        return payload as RepoCommitActivity;
      })
      .then((payload) => {
        setCommitCache((prev) => ({
          ...prev,
          [repoIdentity.key]: payload,
        }));
        setCommitErrors((prev) => {
          if (!prev[repoIdentity.key]) return prev;
          const next = { ...prev };
          delete next[repoIdentity.key];
          return next;
        });
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message = err instanceof Error
          ? err.message
          : "Failed to load repository commits.";
        setCommitErrors((prev) => ({
          ...prev,
          [repoIdentity.key]: message,
        }));
      });

    return () => controller.abort();
  }, [planet, repoIdentity, commitActivity, commitError]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      width: "300px",
      background: "rgba(2, 8, 14, 0.96)",
      borderLeft: "1px solid rgba(0,229,255,0.2)",
      backdropFilter: "blur(18px)",
      padding: "20px 18px",
      display: "flex",
      flexDirection: "column",
      transform: planet ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.25s ease",
      zIndex: 9999,
      overflowY: "auto",
    }}>
      {/* Decorative corners */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 8, height: 8,
        borderTop: "1px solid #00e5ff",
        borderLeft: "1px solid #00e5ff",
      }} />
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: 8, height: 8,
        borderBottom: "1px solid #00e5ff",
        borderRight: "1px solid #00e5ff",
      }} />

      {planet && (
        <>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(0,229,255,0.55)",
            marginBottom: "16px",
          }}>OBJECT LOCKED</div>

          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: 10,
                height: 10,
                background: planet.color,
                boxShadow: `0 0 10px ${planet.color}`,
                borderRadius: "50%",
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "15px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#e8edf2",
                wordBreak: "break-all",
              }}>{planet.repoName}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "1px solid rgba(0,229,255,0.2)",
                padding: "2px 8px",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: "rgba(140,160,180,0.6)",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#e8edf2";
                e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(140,160,180,0.6)";
                e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)";
              }}
            >ESC</button>
          </div>

          {/* Description */}
          {planet.description && (
            <p style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "rgba(140,160,180,0.7)",
              marginBottom: "14px",
              lineHeight: 1.6,
              letterSpacing: "0.02em",
            }}>{planet.description}</p>
          )}

          <div style={{ height: "1px", background: "rgba(0,229,255,0.1)", marginBottom: "14px" }} />

          {/* Stats */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "9px",
            marginBottom: "18px",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}>
            {([
              ["STARS", planet.stars],
              ["FORKS", planet.forks],
              ["CLASS", planet.type.toUpperCase()],
              planet.language ? ["LANG", planet.language] : null,
              planet.hasRing ? ["RING", "YES"] : null,
              planet.hasMoon ? ["MOON", "YES"] : null,
            ] as ([string, string | number] | null)[])
              .filter((item): item is [string, string | number] => item !== null)
              .map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(0,229,255,0.5)", letterSpacing: "0.08em" }}>{label}</span>
                  <span style={{ color: "rgba(180,200,220,0.9)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
          </div>

          <div style={{ height: "1px", background: "rgba(0,229,255,0.1)", marginBottom: "18px" }} />

          {/* Commit graph */}
          <div
            style={{
              border: "1px solid rgba(0,229,255,0.16)",
              background: "rgba(2, 16, 24, 0.6)",
              padding: "10px",
              marginBottom: "16px",
              boxShadow: "inset 0 0 18px rgba(0,229,255,0.08)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(0,229,255,0.58)",
                marginBottom: "8px",
              }}
            >
              Commit Flux
            </div>

            {loadingCommits && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "rgba(140,160,180,0.78)",
                  letterSpacing: "0.04em",
                  minHeight: "56px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                SCANNING ORBITAL LOGS...
              </div>
            )}

            {!loadingCommits && activeCommitError && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "#ff667c",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ marginBottom: "7px" }}>ERR &gt; {activeCommitError}</div>
                {commitError && repoIdentity && (
                  <button
                    onClick={() => {
                      setCommitErrors((prev) => {
                        const next = { ...prev };
                        delete next[repoIdentity.key];
                        return next;
                      });
                    }}
                    style={{
                      background: "none",
                      border: "1px solid rgba(255,102,124,0.35)",
                      color: "#ff9aab",
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {!loadingCommits && !activeCommitError && commitActivity && commitActivity.totalCommits === 0 && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "rgba(140,160,180,0.78)",
                  lineHeight: 1.5,
                }}
              >
                No commits detected in the last {commitActivity.windowDays} days.
              </div>
            )}

            {!loadingCommits && !activeCommitError && commitActivity && commitActivity.totalCommits > 0 && (
              <CommitChart activity={commitActivity} />
            )}
          </div>

          <a
            href={planet.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#00e5ff",
              textDecoration: "none",
              borderBottom: "1px solid rgba(0,229,255,0.3)",
              paddingBottom: "1px",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.opacity = "0.7")}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.opacity = "1")}
          >
            VIEW ON GITHUB &gt;
          </a>

          {/* Keyboard hint */}
          <div style={{
            marginTop: "auto",
            paddingTop: "20px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "rgba(80,100,120,0.7)",
            letterSpacing: "0.08em",
            display: "flex",
            gap: "10px",
          }}>
            <span>← → CYCLE</span>
            <span>ESC CLOSE</span>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
