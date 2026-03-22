"use client";

import { usePathname } from "next/navigation";

export default function ToolNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const linkStyle = { fontSize: "12px", color: "#94a3b8", textDecoration: "none" as const, padding: "4px 10px", borderRadius: "4px", transition: "color 0.15s" };
  const divider = <span style={{ color: "#475569", fontSize: "10px" }}>/</span>;

  return (
    <nav style={{ background: "#1e293b", padding: "0 16px", display: "flex", alignItems: "center", gap: "4px", height: "32px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <span style={{ fontSize: "11px", color: "#94a3b8", letterSpacing: "0.5px", marginRight: "12px", textTransform: "uppercase" as const, fontWeight: "bold" }}>
        PD Tools
      </span>
      <a href="https://brief.tools.planetdetroit.org/" style={linkStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}>
        Brief Generator
      </a>
      {divider}
      <a href="https://newsletter.tools.planetdetroit.org/" style={linkStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}>
        Newsletter Builder
      </a>
      {divider}
      <a href="https://civic.tools.planetdetroit.org/" style={linkStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}>
        Civic Action
      </a>
      {divider}
      <a href="https://events.planetdetroit.org/admin" style={linkStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}>
        Events
      </a>
      {divider}
      <span style={{ fontSize: "12px", color: "#ffffff", padding: "4px 10px", fontWeight: "600" }}>
        Social Publisher
      </span>
      <button onClick={handleLogout}
        style={{ fontSize: "11px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginLeft: "auto", padding: "4px 8px", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}>
        Sign out
      </button>
    </nav>
  );
}
