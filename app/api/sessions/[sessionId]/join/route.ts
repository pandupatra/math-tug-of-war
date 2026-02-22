import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const { data: existing, error: readError } = await supabaseServer
    .from("game_sessions")
    .select("id, player2_token")
    .eq("id", sessionId)
    .single();

  if (readError || !existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (existing.player2_token) {
    return NextResponse.json({ error: "Session is already full" }, { status: 409 });
  }

  const player2Token = randomUUID();

  const { data, error } = await supabaseServer
    .from("game_sessions")
    .update({ player2_token: player2Token, status: "active", version: 1 })
    .eq("id", sessionId)
    .is("player2_token", null)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to join session (it may have been claimed already)" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    session: data,
    token: player2Token,
    role: 2
  });
}
