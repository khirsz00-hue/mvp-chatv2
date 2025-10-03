// src/app/api/todoist/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildTodoistAuthUrl } from "@/lib/todoist";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid"); // przekazane z frontendowego przycisku
  if (!uid) return new NextResponse("Missing uid", { status: 400 });

  // origin bieżącego requestu – działa na Preview i Production
  const origin = url.origin;
  const authUrl = buildTodoistAuthUrl({ origin, uid });

  return NextResponse.redirect(authUrl);
}
