// src/app/hats/page.tsx
import type { Metadata } from "next";
import HatsGuided from "@/components/HatsGuided";
import { createSupabaseServer } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Six Thinking Hats – ZenON",
  description: "Prowadzony proces decyzyjny (ADHD-friendly) z historią rozmów.",
};

export default async function HatsPage() {
  // Pobierz zalogowanego usera z Supabase (magic link)
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold tracking-tight">ZenON</div>
            <div className="text-xs rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 border border-zinc-200">
              Asystenci ADHD & anty-prokrastynacja
            </div>
          </div>

          <div className="text-sm text-zinc-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Six Thinking Hats Turbo
            </span>
          </div>
        </div>

        <div className="mt-6">
          {!user ? (
            <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="text-lg font-semibold mb-1">Zaloguj się</div>
              <p className="text-sm text-zinc-600">
                Aby korzystać z asystenta i zapisywać historię rozmów, zaloguj
                się przez magic link. Jeśli masz już przycisk „Zaloguj” w
                aplikacji – skorzystaj z niego. Po zalogowaniu wróć na{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5">/hats</code>.
              </p>
            </div>
          ) : (
            // ZALOGOWANY → render guided chat z historią
            <HatsGuided userId={user.id} />
          )}
        </div>
      </div>
    </main>
  );
}
