'use client';
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export function SignIn(){
  const sb = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const send = async ()=>{
    setError(null);
    const redirectTo = `${window.location.origin}`;
    const { error } = await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: redirectTo }});
    if(error) setError(error.message); else setSent(true);
  };
  return (
    <div className="max-w-md mx-auto mt-24 card">
      <h1 className="text-2xl font-bold">Zaloguj się magic linkiem</h1>
      <p className="text-sm text-zinc-600 mt-1">Podaj e-mail. Jeśli jesteś na liście dostępu, wyślemy link.</p>
      <div className="mt-4 space-y-3">
        <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
        <button className="btn bg-ink text-white" onClick={send}>Wyślij link</button>
        {sent && <div className="text-green-600">Sprawdź skrzynkę ✉️</div>}
        {error && <div className="text-red-600">{error}</div>}
      </div>
    </div>
  );
}
