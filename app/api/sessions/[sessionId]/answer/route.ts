import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeAnswer } from "@/lib/math";
import { supabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  token: z.string().uuid(),
  nonce: z.string().min(8).max(64),
  answer: z.union([z.string(), z.number()])
});

type AttemptAnswerRow = {
  accepted: boolean;
  reason: string;
  session: Record<string, unknown> | null;
};

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

  const answer = sanitizeAnswer(parsed.data.answer);

  const { data, error } = await supabaseServer.rpc("attempt_answer", {
    p_session_id: sessionId,
    p_player_token: parsed.data.token,
    p_answer: answer,
    p_nonce: parsed.data.nonce
  });

  if (error) {
    return NextResponse.json({ error: "Could not process answer" }, { status: 500 });
  }

  const result = data as AttemptAnswerRow;

  return NextResponse.json({
    accepted: result.accepted,
    reason: result.reason,
    session: result.session
  });
}
