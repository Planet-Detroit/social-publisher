"use client";

import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";

const tools = [
  { label: "Brief Generator", href: "https://brief.tools.planetdetroit.org/" },
  { label: "Newsletter Builder", href: "https://newsletter.tools.planetdetroit.org/" },
  { label: "Civic Action", href: "https://civic.tools.planetdetroit.org/" },
  { label: "Events", href: "https://events.planetdetroit.org/admin" },
  { label: "Social Publisher", href: null }, // current tool — no link
];

export default function ToolNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.href = "https://tools.planetdetroit.org/";
  };

  return (
    <nav style={{
      background: "#333333",
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      height: "34px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
    }}>
      <a href="https://tools.planetdetroit.org/" style={{
        fontSize: "11px",
        color: "#2982C4",
        letterSpacing: "0.5px",
        marginRight: "12px",
        textTransform: "uppercase" as const,
        fontWeight: "bold",
        textDecoration: "none",
      }}>
        PD Tools
      </a>

      {tools.map((tool, i) => (
        <span key={tool.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {i > 0 && <span style={{ color: "#666", fontSize: "10px" }}>/</span>}
          {tool.href ? (
            <a
              href={tool.href}
              style={{
                fontSize: "12px",
                color: "#999",
                textDecoration: "none",
                padding: "4px 10px",
                borderRadius: "4px",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
            >
              {tool.label}
            </a>
          ) : (
            <span style={{
              fontSize: "12px",
              color: "#ffffff",
              padding: "4px 10px",
              fontWeight: "600",
            }}>
              {tool.label}
            </span>
          )}
        </span>
      ))}

      <button
        onClick={handleLogout}
        style={{
          fontSize: "11px",
          color: "#999",
          background: "none",
          border: "none",
          cursor: "pointer",
          marginLeft: "auto",
          padding: "4px 8px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
      >
        Sign out
      </button>
    </nav>
  );
}
