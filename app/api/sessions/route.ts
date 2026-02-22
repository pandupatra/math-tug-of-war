import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { generateMathProblem } from "@/lib/math";
import { sanitizePlayerName } from "@/lib/player";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  name: z.string()
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const playerName = sanitizePlayerName(parsed.data.name);
  const player1Token = randomUUID();
  const problem = generateMathProblem();

  const { data, error } = await supabaseServer
    .from("game_sessions")
    .insert({
      player1_token: player1Token,
      player1_name: playerName,
      current_problem: problem,
      status: "waiting",
      rope_position: 50,
      winner: null,
      version: 0
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    session: data,
    token: player1Token,
    role: 1
  });
}
