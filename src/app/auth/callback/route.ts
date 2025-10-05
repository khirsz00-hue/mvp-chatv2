// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createSupabaseServer();
    try {
      // Zamienia ?code=... na sesję i zapisuje cookies
      await supabase.auth.exchangeCodeForSession(code);
    } catch (e) {
      console.error("exchangeCodeForSession error:", (e as any)?.message);
    }
  }

  // Gdzie chcesz wracać po zalogowaniu:
  const redirectTo = url.searchParams.get("next") ?? "/";
  return NextResponse.redirect(new URL(redirectTo, url));
}
