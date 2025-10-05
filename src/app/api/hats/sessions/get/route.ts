import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!id || !userId) return NextResponse.json({ error: "missing id/userId" }, { status: 400 });

  const { data: session, error: e1 } = await supabaseAdmin
    .from("hats_sessions")
    .select("id, title, current_index, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: messages, error: e2 } = await supabaseAdmin
    .from("hats_messages")
    .select("id, role, hat, content, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true, session, messages });
}
