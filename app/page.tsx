"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, Link2, Trophy } from "lucide-react";
import type { DailyLeaderboardEntry } from "@/types/game";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leaderboardDay, setLeaderboardDay] = useState("");
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadLeaderboard() {
      const response = await fetch("/api/leaderboard");
      const payload = await response.json();
      if (!response.ok || !mounted) return;
      setLeaderboardDay(payload.day);
      setLeaderboard(payload.entries ?? []);
    }

    void loadLeaderboard();
    const interval = window.setInterval(() => {
      void loadLeaderboard();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  async function createSession() {
    setError("");
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Enter your name first (at least 2 characters).");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName })
    });
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
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Enter your name first (at least 2 characters).");
      return;
    }

    if (!joinId.trim()) {
      setError("Enter a session ID to join.");
      return;
    }

    localStorage.setItem(`mtw-pending-name:${joinId.trim()}`, trimmedName);
    router.push(`/game/${joinId.trim()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <div className="chalk-panel w-full rounded-3xl p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <Swords className="h-8 w-8 text-[#facc15]" />
          <h1 className="fun-title math-glow text-3xl sm:text-4xl">Math Tug of War</h1>
        </div>

        <p className="mb-6 text-lg text-slate-100">
          Two brains enter. One brain leaves with bragging rights. Solve faster and yank the rope your way.
        </p>

        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-100">
            Your name (shown in game + leaderboard)
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. MathNinja"
            className="w-full rounded-lg border-2 border-cyan-300 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 focus:ring"
          />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <button
            disabled={loading}
            onClick={createSession}
            className="wiggle-on-hover rounded-xl border-2 border-yellow-200 bg-yellow-400 px-5 py-4 text-lg font-black text-slate-900 transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? "Cooking Match..." : "Start Brain Battle"}
          </button>

          <div className="rounded-xl border-2 border-pink-300 bg-pink-600 p-3">
            <label htmlFor="joinId" className="mb-2 flex items-center gap-2 text-sm text-slate-100">
              <Link2 className="h-4 w-4" />
              Join Existing Chaos
            </label>
            <div className="flex gap-2">
              <input
                id="joinId"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste session ID here"
                className="w-full rounded-md border-2 border-pink-200 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-pink-200 focus:ring"
              />
              <button
                onClick={joinSession}
                className="rounded-md border-2 border-cyan-200 bg-cyan-500 px-4 py-2 text-sm font-black text-slate-900 hover:bg-cyan-400"
              >
                Crash In
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border-2 border-cyan-300 bg-slate-800 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-300" />
            <h2 className="fun-title text-lg">Daily Leaderboard</h2>
            <span className="text-xs text-slate-300">{leaderboardDay || "today"}</span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-200">No matches finished yet today. Be the first legend.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Player</th>
                    <th className="py-2 pr-4">Wins</th>
                    <th className="py-2 pr-4">Losses</th>
                    <th className="py-2">Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={`${entry.day}-${entry.player_name}`} className="border-t border-slate-600">
                      <td className="py-2 pr-4 font-bold">{index + 1}</td>
                      <td className="py-2 pr-4">{entry.player_name}</td>
                      <td className="py-2 pr-4">{entry.wins}</td>
                      <td className="py-2 pr-4">{entry.losses}</td>
                      <td className="py-2">{entry.matches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
