"use client";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PLANET_TYPES = [
  { color: "#a8d4f0", label: "ICY", desc: "0 stars + inactive" },
  { color: "#c87941", label: "ROCKY", desc: "Activity-driven" },
  { color: "#e8a84a", label: "GASEOUS", desc: "High stars ratio" },
];

const FEATURES = [
  { symbol: "◎", color: "#aaccee", label: "RING", desc: "≥ 50 stars" },
  { symbol: "●", color: "#88aabb", label: "MOON", desc: "≥ 10 forks" },
];

const ENCODING = [
  { label: "SIZE", desc: "Activity score" },
  { label: "COLOR", desc: "Primary language" },
];

export default function LegendPanel({ visible, onClose }: Props) {
  return (
    <div style={{
      position: "absolute",
      bottom: "16px",
      right: "16px",
      background: "rgba(2, 8, 14, 0.96)",
      border: "1px solid rgba(0,229,255,0.22)",
      backdropFilter: "blur(14px)",
      padding: "14px 16px",
      width: "220px",
      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
      transform: visible ? "translateY(0)" : "translateY(calc(100% + 24px))",
      transition: "transform 0.25s ease",
      zIndex: 90,
      pointerEvents: visible ? "auto" : "none",
    }}>
      {/* Decorative corners */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderTop: "1px solid #00e5ff", borderLeft: "1px solid #00e5ff" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderBottom: "1px solid #00e5ff", borderRight: "1px solid #00e5ff" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(0,229,255,0.55)",
        }}>VISUAL LEGEND</div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "rgba(140,160,180,0.5)",
            padding: 0,
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e8edf2")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(140,160,180,0.5)")}
        >✕</button>
      </div>

      {/* Planet classes */}
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.12em",
        color: "rgba(0,229,255,0.4)",
        textTransform: "uppercase",
        marginBottom: "7px",
      }}>Planet Classes</div>

      {PLANET_TYPES.map(({ color, label, desc }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 5px ${color}`,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#e8edf2",
            minWidth: "52px",
            letterSpacing: "0.04em",
          }}>{label}</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(140,160,180,0.6)",
          }}>{desc}</span>
        </div>
      ))}

      <div style={{ height: "1px", background: "rgba(0,229,255,0.1)", margin: "10px 0" }} />

      {/* Features */}
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.12em",
        color: "rgba(0,229,255,0.4)",
        textTransform: "uppercase",
        marginBottom: "7px",
      }}>Features</div>

      {FEATURES.map(({ symbol, color, label, desc }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ fontSize: "10px", color, minWidth: "8px", textAlign: "center", flexShrink: 0 }}>{symbol}</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#e8edf2",
            minWidth: "52px",
            letterSpacing: "0.04em",
          }}>{label}</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(140,160,180,0.6)",
          }}>{desc}</span>
        </div>
      ))}

      <div style={{ height: "1px", background: "rgba(0,229,255,0.1)", margin: "10px 0" }} />

      {/* Encoding */}
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.12em",
        color: "rgba(0,229,255,0.4)",
        textTransform: "uppercase",
        marginBottom: "7px",
      }}>Encoding</div>

      {ENCODING.map(({ label, desc }) => (
        <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "5px" }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#e8edf2",
            minWidth: "44px",
            letterSpacing: "0.04em",
          }}>{label}</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(140,160,180,0.6)",
          }}>{desc}</span>
        </div>
      ))}
    </div>
  );
}
