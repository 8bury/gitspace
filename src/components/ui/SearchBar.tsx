"use client";

import { useState, FormEvent } from "react";

interface Props {
  onSearch: (username: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "420px" }}>
      <div style={{ position: "relative", flex: 1 }}>
        {/* Corner decorations */}
        <span style={{
          position: "absolute", top: 0, left: 0,
          width: 6, height: 6,
          borderTop: "1px solid #00e5ff",
          borderLeft: "1px solid #00e5ff",
          pointerEvents: "none", zIndex: 1,
        }} />
        <span style={{
          position: "absolute", bottom: 0, right: 0,
          width: 6, height: 6,
          borderBottom: "1px solid #00e5ff",
          borderRight: "1px solid #00e5ff",
          pointerEvents: "none", zIndex: 1,
        }} />

        <span style={{
          position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
          fontFamily: "var(--font-mono)", fontSize: "11px",
          color: "rgba(0,229,255,0.5)", pointerEvents: "none",
          letterSpacing: "0.05em",
        }}>
          &gt;_
        </span>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="github username"
          disabled={loading}
          style={{
            width: "100%",
            background: "rgba(0,229,255,0.04)",
            border: "1px solid rgba(0,229,255,0.25)",
            borderRadius: 0,
            padding: "9px 12px 9px 36px",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.06em",
            color: "#e8edf2",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            opacity: loading ? 0.5 : 1,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(0,229,255,0.6)";
            e.target.style.boxShadow = "0 0 12px rgba(0,229,255,0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(0,229,255,0.25)";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !value.trim()}
        style={{
          background: loading || !value.trim() ? "transparent" : "rgba(0,229,255,0.1)",
          border: "1px solid rgba(0,229,255,0.4)",
          borderRadius: 0,
          padding: "9px 20px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: loading || !value.trim() ? "rgba(0,229,255,0.3)" : "#00e5ff",
          cursor: loading || !value.trim() ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
        }}
        onMouseEnter={(e) => {
          if (!loading && value.trim()) {
            (e.target as HTMLButtonElement).style.background = "rgba(0,229,255,0.18)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(0,229,255,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = loading || !value.trim() ? "transparent" : "rgba(0,229,255,0.1)";
          (e.target as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        {loading ? "..." : "SCAN"}
      </button>
    </form>
  );
}
