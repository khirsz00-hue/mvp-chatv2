import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, resolveBaseUrl, saveTodoistToken } from "@/lib/todoist";

function html(msg: string, code = 400) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><pre>${msg}</pre>`,
    { status: code, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    let uid = url.searchParams.get("uid") || "";

    if (!uid && state) {
      try {
        const parsed = JSON.parse(decodeURIComponent(state));
        uid = parsed?.uid || "";
      } catch (e: any) {
        return html(`Bad state: ${String(e)}`, 400);
      }
    }

    if (!code) return html("Missing 'code' parameter", 400);
    if (!uid) return html("Missing 'uid' (state) parameter", 400);

    const token = await exchangeCodeForToken(code);
    await saveTodoistToken(uid, token.access_token);

    const base = resolveBaseUrl(url.origin);
    return NextResponse.redirect(`${base}/?todoist=connected`);
  } catch (e: any) {
    console.error("Todoist callback error:", e);
    return html(`Callback error: ${e?.message || String(e)}`, 500);
  }
}
