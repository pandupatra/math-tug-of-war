"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, Link2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createSession() {
    setError("");
    setLoading(true);

    const response = await fetch("/api/sessions", { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not create session");
      setLoading(false);
      return;
    }

    localStorage.setItem(`mtw-token:${payload.session.id}`, payload.token);
    router.push(`/game/${payload.session.id}`);
  }

  function joinSession() {
    if (!joinId) return;
    router.push(`/game/${joinId.trim()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <div className="chalk-panel rounded-3xl p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <Swords className="h-8 w-8 text-[#ffd84d]" />
          <h1 className="fun-title math-glow text-3xl sm:text-4xl">Math Tug of War</h1>
        </div>

        <p className="mb-8 text-lg text-white/85">
          Two brains enter. One brain leaves with bragging rights. Solve faster and yank the rope your way.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            disabled={loading}
            onClick={createSession}
            className="wiggle-on-hover rounded-xl bg-[#ffd84d] px-5 py-4 text-lg font-black text-[#172132] shadow-lg shadow-black/35 transition hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Cooking Match..." : "Start Brain Battle"}
          </button>

          <div className="rounded-xl border border-white/20 bg-black/25 p-3">
            <label htmlFor="joinId" className="mb-2 flex items-center gap-2 text-sm text-white/70">
              <Link2 className="h-4 w-4" />
              Join Existing Chaos
            </label>
            <div className="flex gap-2">
              <input
                id="joinId"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste session ID here"
                className="w-full rounded-md border border-white/25 bg-black/45 px-3 py-2 text-sm outline-none ring-[#2fe8ff] focus:ring"
              />
              <button
                onClick={joinSession}
                className="rounded-md bg-[#2fe8ff]/30 px-4 py-2 text-sm font-black hover:bg-[#2fe8ff]/45"
              >
                Crash In
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-[#ff8c8c]">{error}</p> : null}
      </div>
    </main>
  );
}
