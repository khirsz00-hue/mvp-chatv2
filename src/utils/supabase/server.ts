// src/utils/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Minimalny helper do pobrania zalogowanego użytkownika w App Router,
 * bez @supabase/auth-helpers-nextjs.
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
        // set/remove są wymagane przez API, ale w SSR/route handlerach i tak zwykle nie ustawiamy.
        // Implementujemy je jako no-op, żeby typy były zadowolone.
        set(name: string, value: string, options: CookieOptions) {
          // no-op
        },
        remove(name: string, options: CookieOptions) {
          // no-op
        },
      },
    }
  );
}
