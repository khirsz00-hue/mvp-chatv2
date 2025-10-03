import { NextRequest, NextResponse } from "next/server";
import { removeTodoistToken } from "@/lib/todoist";
export async function POST(req: NextRequest){
  const { userId } = await req.json();
  if(!userId) return new NextResponse("Missing userId", { status:400 });
  await removeTodoistToken(userId);
  return NextResponse.json({ ok:true });
}
