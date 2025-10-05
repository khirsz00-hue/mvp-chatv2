"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    const sb = supabaseBrowser();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        // bardzo ważne: kierujemy na nasz handler PKCE
        emailRedirectTo: `${origin}/auth/callback?next=/`,
      },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-6 space-y-3">
      <div className="text-lg font-semibold">Zaloguj się</div>
      <input
        className="input"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e)=> setEmail(e.target.value)}
      />
      <button className="btn bg-ink text-white" onClick={send} disabled={!email}>
        Wyślij magic link
      </button>
      {sent && <div className="text-sm text-emerald-600">Sprawdź skrzynkę ✉️</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
