"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RotateCcw } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { GameSession, PlayerRole } from "@/types/game";
import { GameBoard } from "@/components/GameBoard";
import { MathInput } from "@/components/MathInput";

type SessionControllerProps = {
  sessionId: string;
};

export function SessionController({ sessionId }: SessionControllerProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [joinName, setJoinName] = useState("");
  const [needsJoinName, setNeedsJoinName] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const previousStatusRef = useRef<GameSession["status"] | null>(null);

  const goodFeedback = useMemo(
    () => ["Clean hit. Rope says ouch.", "Math wizard behavior.", "Boom. That answer had torque."],
    []
  );
  const staleFeedback = useMemo(
    () => ["Too slow. New problem dropped.", "That answer arrived in another timeline."],
    []
  );

  const shareLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/game/${sessionId}`;
  }, [sessionId]);

  const syncSession = useCallback(
    async (currentToken: string, silent = false) => {
      const sessionRes = await fetch(`/api/sessions/${sessionId}?token=${currentToken}`);
      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        if (!silent) setError(sessionData.error ?? "Could not refresh session");
        return;
      }

      setSession(sessionData.session as GameSession);
      setRole(sessionData.role as PlayerRole);
      if (!silent) setError("");
    },
    [sessionId]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      setError("");
      const storageKey = `mtw-token:${sessionId}`;
      let currentToken = localStorage.getItem(storageKey);

      if (!currentToken) {
        const pendingNameKey = `mtw-pending-name:${sessionId}`;
        const pendingName = localStorage.getItem(pendingNameKey)?.trim();
        if (pendingName && pendingName.length >= 2) {
          const joinRes = await fetch(`/api/sessions/${sessionId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: pendingName })
          });
          const joinData = await joinRes.json();

          if (!joinRes.ok) {
            setError(joinData.error ?? "Could not join session");
            setLoading(false);
            return;
          }

          currentToken = joinData.token as string;
          localStorage.removeItem(pendingNameKey);
        } else {
          setNeedsJoinName(true);
          setLoading(false);
          return;
        }
      }

      if (!currentToken) {
        setError("Missing player token");
        setLoading(false);
        return;
      }

      localStorage.setItem(storageKey, currentToken);
      await syncSession(currentToken);

      if (!cancelled) {
        setToken(currentToken);
        setLoading(false);
      }
    }

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, syncSession]);

  async function joinAsPlayerTwo() {
    const trimmedName = joinName.trim();
    if (trimmedName.length < 2) {
      setError("Enter your name first (at least 2 characters).");
      return;
    }

    setJoining(true);
    setError("");

    const response = await fetch(`/api/sessions/${sessionId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not join session");
      setJoining(false);
      return;
    }

    const joinedToken = payload.token as string;
    localStorage.setItem(`mtw-token:${sessionId}`, joinedToken);
    await syncSession(joinedToken);
    setToken(joinedToken);
    setNeedsJoinName(false);
    setJoining(false);
  }

  useEffect(() => {
    if (!sessionId || !token) return;

    const channel = supabaseBrowser
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          setSession(payload.new as GameSession);
        }
      )
      .subscribe();

    const intervalMs = session?.status === "active" ? 1000 : 1500;
    const interval = window.setInterval(() => {
      void syncSession(token, true);
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
      supabaseBrowser.removeChannel(channel);
    };
  }, [sessionId, session?.status, syncSession, token]);

  useEffect(() => {
    if (!session) return;

    const previousStatus = previousStatusRef.current;
    const currentStatus = session.status;

    if (
      currentStatus === "active" &&
      previousStatus !== "active" &&
      session.rope_position === 50 &&
      session.winner === null
    ) {
      setCountdown(3);
    }

    if (currentStatus !== "active") {
      setCountdown(null);
    }

    previousStatusRef.current = currentStatus;
  }, [session]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = window.setTimeout(() => {
      setCountdown((current) => {
        if (current === null) return current;
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdown]);

  async function submitAnswer(answer: number, nonce: string) {
    if (!token) return;

    const response = await fetch(`/api/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answer, nonce })
    });

    const payload = await response.json();

    if (!response.ok) {
      setFeedback(payload.error ?? "Answer failed");
      return;
    }

    if (!payload.accepted) {
      if (payload.reason === "wrong_answer") setFeedback("Wrong answer.");
      if (payload.reason === "stale_problem") {
        const idx = Math.floor(Math.random() * staleFeedback.length);
        setFeedback(staleFeedback[idx]);
      }
      await syncSession(token, true);
      return;
    }

    const idx = Math.floor(Math.random() * goodFeedback.length);
    setFeedback(goodFeedback[idx]);
    await syncSession(token, true);
  }

  async function rematch() {
    if (!token) return;

    const response = await fetch(`/api/sessions/${sessionId}/rematch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    const payload = await response.json();

    if (!response.ok) {
      setFeedback(payload.error ?? "Could not start rematch");
      return;
    }

    setSession(payload.session);
    setFeedback("Rematch started.");
    await syncSession(token, true);
  }

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setFeedback("Join link copied.");
  }

  if (loading || !session || !role) {
    if (!loading && needsJoinName) {
      return (
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <section className="chalk-panel w-full max-w-lg rounded-2xl p-6">
            <h2 className="fun-title mb-2 text-xl">Enter Your Name</h2>
            <p className="mb-4 text-sm text-slate-200">
              Pick your player name before joining this match.
            </p>
            <div className="flex gap-2">
              <input
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="e.g. QuickCalc"
                className="w-full rounded-md border-2 border-cyan-300 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 focus:ring"
              />
              <button
                onClick={joinAsPlayerTwo}
                disabled={joining}
                className="rounded-md border-2 border-yellow-200 bg-yellow-400 px-4 py-2 text-sm font-black text-slate-900 disabled:opacity-60"
              >
                {joining ? "Joining..." : "Join"}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </section>
        </main>
      );
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <p className="fun-title text-slate-100">Loading Math Madness...</p>
      </main>
    );
  }

  const myName = role === 1 ? session.player1_name : session.player2_name ?? "Player 2";
  const opponentName = role === 1 ? session.player2_name ?? "Waiting..." : session.player1_name;
  const countdownActive = session.status === "active" && countdown !== null && countdown > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
      <div className="w-full space-y-4">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="fun-title math-glow text-2xl">Session {session.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-200">
            {myName} (Player {role}) vs {opponentName}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="wiggle-on-hover inline-flex items-center gap-2 rounded-lg border-2 border-cyan-300 bg-cyan-600 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-cyan-500"
          >
            <Copy className="h-4 w-4" />
            Copy Join Link
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border-2 border-rose-300 bg-rose-600 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-rose-500"
          >
            Exit
          </button>
        </div>
      </header>

      {session.status === "waiting" ? (
        <section className="chalk-panel rounded-2xl p-8 text-center">
          <p className="fun-title text-xl">Waiting for Opponent...</p>
          <p className="mt-2 text-slate-100">Share the link. We are one nerd short.</p>
          <button
            onClick={copyLink}
            className="wiggle-on-hover mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-yellow-200 bg-yellow-400 px-4 py-2 font-black text-slate-900"
          >
            <Copy className="h-4 w-4" />
            Copy Summon Link
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          <GameBoard
            ropePosition={session.rope_position}
            myRole={role}
            winner={session.winner}
            player1Name={session.player1_name}
            player2Name={session.player2_name ?? "Waiting..."}
          />

          {countdownActive ? (
            <section className="chalk-panel rounded-2xl bg-slate-800 p-6 text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-200">Match starts in</p>
              <p className="fun-title mt-2 text-5xl text-yellow-300">{countdown}</p>
            </section>
          ) : null}

          <MathInput
            problem={session.current_problem}
            disabled={session.status !== "active" || countdownActive}
            onSubmit={submitAnswer}
          />

          {session.status === "finished" ? (
            <button
              onClick={rematch}
              className="wiggle-on-hover inline-flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-emerald-500"
            >
              <RotateCcw className="h-4 w-4" />
              Run It Back
            </button>
          ) : null}

          {feedback ? <p className="text-sm text-slate-100">{feedback}</p> : null}
          {error ? <p className="text-sm text-warning">{error}</p> : null}
        </div>
      )}
      </div>
    </main>
  );
}
