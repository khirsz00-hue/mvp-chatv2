// src/utils/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server-side Supabase client dla Next.js App Router.
 * Ten wariant zapisuje/usuwa cookies, więc sesja nie "ginie" między żądaniami.
 */
export function createSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // ważne: TRWAŁY zapis ciastek po stronie serwera
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          // ważne: usuwanie ciastek po stronie serwera
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}
