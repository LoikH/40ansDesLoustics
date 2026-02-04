"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") ?? "/admin";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setErr("Mauvais identifiants 😬");
      return;
    }

    router.replace(next);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-extrabold">Admin Login</h1>

        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 p-3 outline-none"
          placeholder="Utilisateur"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 p-3 outline-none"
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button disabled={loading} className="w-full rounded-xl bg-red-500 py-3 font-black text-black disabled:opacity-60">
          {loading ? "..." : "Se connecter"}
        </button>

        {err && <p className="text-red-400">{err}</p>}
      </form>
    </main>
  );
}

