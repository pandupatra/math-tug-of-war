import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { generateMathProblem } from "@/lib/math";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const player1Token = randomUUID();
  const problem = generateMathProblem();

  const { data, error } = await supabaseServer
    .from("game_sessions")
    .insert({
      player1_token: player1Token,
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
