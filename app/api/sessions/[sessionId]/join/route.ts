import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sanitizePlayerName } from "@/lib/player";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  name: z.string()
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const playerName = sanitizePlayerName(parsed.data.name);

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
    .update({ player2_token: player2Token, player2_name: playerName, status: "active", version: 1 })
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
