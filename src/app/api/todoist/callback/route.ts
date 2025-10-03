// src/app/api/todoist/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, saveTodoistToken } from "@/lib/todoist";

function resolveBaseUrl(fallbackOrigin?: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (fallbackOrigin) return fallbackOrigin;
  return "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // tu przenosimy uid
  let uid = url.searchParams.get("uid") || ""; // fallback (gdyby kiedyś było w redirect_uri)

  if (!uid && state) {
    try {
      const parsed = JSON.parse(decodeURIComponent(state));
      uid = parsed?.uid || "";
    } catch {}
  }

  if (!code || !uid) {
    return new NextResponse("Missing code or uid", { status: 400 });
  }

  const token = await exchangeCodeForToken(code);
  await saveTodoistToken(uid, token.access_token);

  const base = resolveBaseUrl(url.origin);
  return NextResponse.redirect(`${base}/?todoist=connected`);
}
