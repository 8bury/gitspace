import { Planet } from "@/types";

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "16px",
  right: "16px",
  background: "rgba(2, 8, 14, 0.88)",
  border: "1px solid rgba(0,229,255,0.25)",
  backdropFilter: "blur(12px)",
  padding: "12px 14px",
  pointerEvents: "none",
  minWidth: "200px",
  clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
};

export default function PlanetTooltip({ planet }: { planet: Planet }) {
  return (
    <div style={panelStyle}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 6, height: 6,
        borderTop: "1px solid #00e5ff",
        borderLeft: "1px solid #00e5ff",
      }} />

      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.12em",
        color: "rgba(0,229,255,0.6)",
        textTransform: "uppercase",
        marginBottom: "8px",
      }}>
        OBJECT DETECTED
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{
          width: 7, height: 7,
          background: planet.color,
          boxShadow: `0 0 6px ${planet.color}`,
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "15px",
          letterSpacing: "0.04em",
          color: "#e8edf2",
        }}>
          {planet.repoName}
        </span>
      </div>

      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        color: "rgba(140,160,180,0.8)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "rgba(0,229,255,0.55)" }}>STARS</span>
          <span>{planet.stars}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "rgba(0,229,255,0.55)" }}>FORKS</span>
          <span>{planet.forks}</span>
        </div>
        {planet.language && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
            <span style={{ color: "rgba(0,229,255,0.55)" }}>LANG</span>
            <span>{planet.language}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "rgba(0,229,255,0.55)" }}>CLASS</span>
          <span style={{ textTransform: "uppercase" }}>{planet.type}</span>
        </div>
      </div>
    </div>
  );
}
