import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { sessionId, userId, role, hat, content } = await req.json();
  if (!sessionId || !userId || !role || !content) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // validacja sesji należy do usera
  const { error: ownErr } = await supabaseAdmin
    .from("hats_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (ownErr) return NextResponse.json({ error: "no access" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("hats_messages")
    .insert({ session_id: sessionId, role, hat, content })
    .select("id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: data });
}
