import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const tokenSchema = z.string().uuid();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  const tokenParse = tokenSchema.safeParse(token);
  if (!tokenParse.success) {
    return NextResponse.json({ error: "Invalid player token" }, { status: 400 });
  }

  const { data: session, error } = await supabaseServer
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let role: 1 | 2 | null = null;
  if (session.player1_token === tokenParse.data) role = 1;
  if (session.player2_token === tokenParse.data) role = 2;

  if (!role) {
    return NextResponse.json({ error: "Unauthorized for this session" }, { status: 403 });
  }

  return NextResponse.json({ session, role });
}
