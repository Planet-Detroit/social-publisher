"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabase();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F0F0F0" }}>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm" style={{ borderTop: "4px solid #2982C4" }}>
        <div className="text-center mb-6">
          <img
            src="https://planetdetroit.org/wp-content/uploads/2025/08/Asset-2@4x0424.png"
            alt="Planet Detroit"
            className="h-10 mx-auto mb-4"
          />
          <h1 className="text-lg font-bold" style={{ color: "#111111" }}>Social Publisher</h1>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: "#333" }}>
              Check your email for a login link.
            </p>
            <p className="text-xs" style={{ color: "#888" }}>
              Sent to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2.5 border rounded-md mb-4 focus:outline-none focus:ring-2 text-sm"
              style={{ borderColor: "#CCCCCC" }}
              autoFocus
              required
            />
            {error && <p className="text-sm mb-4" style={{ color: "#DD3333" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-2.5 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
              style={{ background: "#2982C4" }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#1e6da3")}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#2982C4")}
            >
              {loading ? "Sending..." : "Send login link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
