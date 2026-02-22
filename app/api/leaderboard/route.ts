import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const querySchema = z.string().date().optional();

export async function GET(req: NextRequest) {
  const dayParam = req.nextUrl.searchParams.get("day") ?? undefined;
  const parsedDay = querySchema.safeParse(dayParam);

  if (!parsedDay.success) {
    return NextResponse.json({ error: "Invalid day. Use YYYY-MM-DD." }, { status: 400 });
  }

  const day = parsedDay.data ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseServer
    .from("daily_leaderboard")
    .select("day, player_name, wins, losses, matches, updated_at")
    .eq("day", day)
    .order("wins", { ascending: false })
    .order("matches", { ascending: false })
    .order("losses", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }

  return NextResponse.json({ day, entries: data ?? [] });
}
