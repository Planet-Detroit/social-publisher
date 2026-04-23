"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/");
    } else {
      setError("Wrong password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F0F0F0" }}>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm" style={{ borderTop: "4px solid #2982C4" }}>
        <div className="text-center mb-6">
          <img
            src="https://planetdetroit.org/wp-content/uploads/2025/08/Asset-2@4x0424.png"
            alt="Planet Detroit"
            className="h-10 mx-auto mb-4"
          />
          <h1 className="text-lg font-bold" style={{ color: "#111111" }}>Social Publisher</h1>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2.5 border rounded-md mb-4 focus:outline-none focus:ring-2 text-sm"
          style={{ borderColor: "#CCCCCC" }}
          autoFocus
        />
        {error && <p className="text-sm mb-4" style={{ color: "#DD3333" }}>{error}</p>}
        <button
          type="submit"
          className="w-full text-white py-2.5 rounded-md font-medium text-sm transition-colors"
          style={{ background: "#2982C4" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1e6da3")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2982C4")}
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
