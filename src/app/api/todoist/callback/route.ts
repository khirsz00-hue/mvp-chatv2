import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, saveTodoistToken } from "@/lib/todoist";
export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const uid = url.searchParams.get("uid");
  if(!code || !uid) return new NextResponse("Missing params", { status:400 });
  const token = await exchangeCodeForToken(code);
  await saveTodoistToken(uid, token.access_token);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/?todoist=connected`);
}
