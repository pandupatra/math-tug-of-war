"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

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
        const joinRes = await fetch(`/api/sessions/${sessionId}/join`, { method: "POST" });
        const joinData = await joinRes.json();

        if (!joinRes.ok) {
          setError(joinData.error ?? "Could not join session");
          setLoading(false);
          return;
        }

        currentToken = joinData.token as string;
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
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <p className="fun-title text-white/85">Loading Math Madness...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="fun-title math-glow text-2xl">Session {session.id.slice(0, 8)}</h1>
          <p className="text-sm text-white/75">You are Player {role}, professional rope philosopher.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="wiggle-on-hover inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/30 px-3 py-2 text-sm hover:bg-black/45"
          >
            <Copy className="h-4 w-4" />
            Copy Join Link
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-white/25 bg-black/30 px-3 py-2 text-sm hover:bg-black/45"
          >
            Exit
          </button>
        </div>
      </header>

      {session.status === "waiting" ? (
        <section className="chalk-panel rounded-2xl p-8 text-center">
          <p className="fun-title text-xl">Waiting for Opponent...</p>
          <p className="mt-2 text-white/80">Share the link. We are one nerd short.</p>
          <button
            onClick={copyLink}
            className="wiggle-on-hover mt-5 inline-flex items-center gap-2 rounded-lg bg-[#ffd84d] px-4 py-2 font-black text-black"
          >
            <Copy className="h-4 w-4" />
            Copy Summon Link
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          <GameBoard ropePosition={session.rope_position} myRole={role} winner={session.winner} />

          <MathInput
            problem={session.current_problem}
            disabled={session.status !== "active"}
            onSubmit={submitAnswer}
          />

          {session.status === "finished" ? (
            <button
              onClick={rematch}
              className="wiggle-on-hover inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/30 px-4 py-2 text-sm font-semibold hover:bg-black/45"
            >
              <RotateCcw className="h-4 w-4" />
              Run It Back
            </button>
          ) : null}

          {feedback ? <p className="text-sm text-white/85">{feedback}</p> : null}
          {error ? <p className="text-sm text-warning">{error}</p> : null}
        </div>
      )}
    </main>
  );
}
