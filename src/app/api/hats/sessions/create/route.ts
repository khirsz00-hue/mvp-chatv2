import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId, title } = await req.json();
  if (!userId) return NextResponse.json({ error: "missing userId" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("hats_sessions")
    .insert({ user_id: userId, title: title ?? "Nowa analiza" })
    .select("id, title, created_at, current_index")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, session: data });
}
