"use client";

import { FormEvent, useState } from "react";
import type { MathProblem } from "@/types/game";

type MathInputProps = {
  problem: MathProblem;
  disabled?: boolean;
  onSubmit: (answer: number, nonce: string) => Promise<void>;
};

export function MathInput({ problem, disabled = false, onSubmit }: MathInputProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || submitting) return;

    const trimmed = answer.trim();
    if (!trimmed || Number.isNaN(Number(trimmed))) return;

    setSubmitting(true);
    await onSubmit(Number(trimmed), problem.nonce);
    setAnswer("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="chalk-panel rounded-2xl p-5">
      <p className="mb-4 text-sm text-white/80">Answer fast. No calculators. No mercy. No emotional support fractions.</p>

      <div className="math-glow mb-4 rounded-lg border border-white/15 bg-[#07111f]/65 px-4 py-5 text-center text-3xl font-black tracking-wide text-[#2fe8ff]">
        {problem.text}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type your genius"
          disabled={disabled || submitting}
          className="w-full rounded-lg border border-white/25 bg-black/40 px-3 py-2 outline-none ring-[#2fe8ff] focus:ring disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={disabled || submitting}
          className="wiggle-on-hover rounded-lg bg-[#ffd84d] px-4 py-2 font-black text-black transition hover:brightness-95 disabled:opacity-60"
        >
          {submitting ? "Firing..." : "Yank"}
        </button>
      </div>
    </form>
  );
}
