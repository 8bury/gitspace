"use client";

import { createPortal } from "react-dom";
import { Planet } from "@/types";

interface Props {
  planet: Planet | null;
  onClose: () => void;
}

export default function PlanetSidebar({ planet, onClose }: Props) {
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
