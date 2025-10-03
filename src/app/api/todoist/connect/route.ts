import { NextResponse } from "next/server";
import { oauthUrl } from "@/lib/todoist";
export async function GET(){ return NextResponse.redirect(oauthUrl()); }
