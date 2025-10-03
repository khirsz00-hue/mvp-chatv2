import { NextRequest, NextResponse } from "next/server";
import { buildTodoistAuthUrl } from "@/lib/todoist";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) return new NextResponse("Missing uid", { status: 400 });

  const origin = url.origin; // działa w preview i production
  const authUrl = buildTodoistAuthUrl({ origin, uid });
  return NextResponse.redirect(authUrl);
}
