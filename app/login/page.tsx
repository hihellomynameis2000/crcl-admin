"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Login failed");
      }
      const nextPath = new URLSearchParams(window.location.search).get("next") || "/";
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f4f2] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[#deded8] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#171714] text-white"><ShieldCheck size={20} /></div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#171714]">CRCL Admin</h1>
            <p className="text-sm font-medium text-black/45">Control room sign in</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-black/45">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="mt-2 h-10 w-full rounded-md border border-[#d7d7d1] bg-[#f7f7f4] px-3 text-sm font-semibold outline-none focus:border-black/40" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-black/45">Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="mt-2 h-10 w-full rounded-md border border-[#d7d7d1] bg-[#f7f7f4] px-3 text-sm font-semibold outline-none focus:border-black/40" />
          </label>
          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
          <button disabled={loading} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#171714] px-4 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60">
            <LockKeyhole size={16} /> {loading ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
