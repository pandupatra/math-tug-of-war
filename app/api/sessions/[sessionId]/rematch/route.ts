import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  token: z.string().uuid()
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

  const { data, error } = await supabaseServer.rpc("reset_match", {
    p_session_id: sessionId,
    p_player_token: parsed.data.token
  });

  if (error || !data) {
    return NextResponse.json({ error: "Unable to reset match" }, { status: 400 });
  }

  return NextResponse.json({ session: data });
}
