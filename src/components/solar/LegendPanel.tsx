"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

export default function LegendPanel() {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const isVisible = open || pinned;

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => {
      if (!pinned) setOpen(false);
    }, 90);
  }, [cancelScheduledClose, pinned]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const TOOLTIP_WIDTH = 220;
    const VIEWPORT_MARGIN = 8;
    const GAP = 8;
    const rect = trigger.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 280;

    const preferredLeft = rect.right - TOOLTIP_WIDTH;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, preferredLeft),
      window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN
    );

    const preferredTop = rect.bottom + GAP;
    const top =
      preferredTop + tooltipHeight > window.innerHeight - VIEWPORT_MARGIN
        ? Math.max(VIEWPORT_MARGIN, rect.top - tooltipHeight - GAP)
        : preferredTop;

    setCoords({ top, left });
  }, []);

  useEffect(() => cancelScheduledClose, [cancelScheduledClose]);

  useEffect(() => {
    if (!isVisible) return;
    updatePosition();
    const onViewportChange = () => updatePosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!pinned) return;
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (tooltipRef.current?.contains(target)) return;
      setPinned(false);
      setOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [pinned]);

  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Visual legend"
        aria-haspopup="true"
        aria-expanded={isVisible}
        onMouseEnter={() => {
          cancelScheduledClose();
          setOpen(true);
          updatePosition();
        }}
        onMouseLeave={() => {
          if (!pinned) scheduleClose();
        }}
        onFocus={() => {
          cancelScheduledClose();
          setOpen(true);
          updatePosition();
        }}
        onBlur={() => {
          if (!pinned) scheduleClose();
        }}
        onClick={() => {
          cancelScheduledClose();
          setPinned((current) => {
            const next = !current;
            if (next) {
              setOpen(true);
              updatePosition();
            } else {
              setOpen(false);
            }
            return next;
          });
        }}
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1px solid rgba(0,229,255,0.4)",
          background: "rgba(0,229,255,0.08)",
          color: "rgba(0,229,255,0.8)",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          fontWeight: 700,
          lineHeight: 1,
          cursor: "help",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ?
      </button>

      {typeof document !== "undefined" && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={() => {
            cancelScheduledClose();
            setOpen(true);
          }}
          onMouseLeave={() => {
            if (!pinned) scheduleClose();
          }}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            background: "rgba(2, 8, 14, 0.96)",
            border: "1px solid rgba(0,229,255,0.22)",
            backdropFilter: "blur(14px)",
            padding: "12px 14px",
            width: "220px",
            maxHeight: "70vh",
            overflowY: "auto",
            clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
            zIndex: 11000,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(-4px)",
            transition: "opacity 0.15s ease, transform 0.15s ease",
            pointerEvents: isVisible ? "auto" : "none",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderTop: "1px solid #00e5ff", borderLeft: "1px solid #00e5ff" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderBottom: "1px solid #00e5ff", borderRight: "1px solid #00e5ff" }} />

          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(0,229,255,0.55)",
            marginBottom: "12px",
          }}>VISUAL LEGEND</div>

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
        </div>,
        document.body
      )}
    </div>
  );
}
