'use client';
import { useCallback, useMemo, useState } from "react";
import { DEFAULT_SEQUENCE, HAT_LABEL, type HatMode } from "@/assistants/hats/prompt";
import { Bubble } from "@/components/MessageBubble";

type Turn = { hat: HatMode; content: string; context?: any };

function StepBadge({ label, active, done }:{
  label:string; active?:boolean; done?:boolean
}){
  return (
    <div
      className={[
        "px-2 py-1 rounded-full text-xs border",
        active ? "bg-blue-600 text-white border-blue-600"
        : done ? "bg-zinc-100 text-zinc-700 border-zinc-200"
        : "bg-white text-zinc-600 border-zinc-200"
      ].join(" ")}
    >
      {label}
    </div>
  );
}

export function HatsFlow({ userId }:{ userId: string }){
  const seq = DEFAULT_SEQUENCE;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentIndex = turns.length;
  const currentHat: HatMode | null = seq[currentIndex] ?? null;
  const nextHat: HatMode | null = seq[currentIndex + 1] ?? null;

  const [inputs, setInputs] = useState<Record<string, any>>({
    goal: "", constraints: "", success: "",
    facts: "", gaps: "", sources: "", assumptions: "",
    feelings: "", reactions: "",
    short: "", mid: "", long: "", best: "",
    risks: "", worst: "", mitigations: "",
    ideas: "", methods: "", tests: "",
  });

  const canProceed = useMemo(()=>{
    if(!currentHat) return false;
    switch(currentHat){
      case "blue_start": return (inputs.goal || inputs.success);
      case "white":     return (inputs.facts || inputs.gaps);
      case "red":       return (inputs.feelings || inputs.reactions);
      case "yellow":    return (inputs.short || inputs.mid || inputs.long);
      case "black":     return (inputs.risks || inputs.mitigations);
      case "green":     return (inputs.ideas || inputs.tests);
      case "blue_final":return true;
      default:          return true;
    }
  }, [currentHat, inputs]);

  const sendStep = useCallback(async () => {
    if(!currentHat || busy) return;
    setBusy(true);
    setErr(null);

    const ctx: any = {};
    if(currentHat === "blue_start"){
      ctx.goal = inputs.goal; ctx.constraints = inputs.constraints; ctx.success = inputs.success;
    }
    if(currentHat === "white"){
      ctx.facts = inputs.facts; ctx.gaps = inputs.gaps; ctx.sources = inputs.sources; ctx.assumptions = inputs.assumptions;
    }
    if(currentHat === "red"){
      ctx.feelings = inputs.feelings; ctx.reactions = inputs.reactions;
    }
    if(currentHat === "yellow"){
      ctx.short = inputs.short; ctx.mid = inputs.mid; ctx.long = inputs.long; ctx.best = inputs.best;
    }
    if(currentHat === "black"){
      ctx.risks = inputs.risks; ctx.worst = inputs.worst; ctx.mitigations = inputs.mitigations;
    }
    if(currentHat === "green"){
      ctx.ideas = inputs.ideas; ctx.methods = inputs.methods; ctx.tests = inputs.tests;
    }

    // timeout 45s – żeby nie wisieć
    const ac = new AbortController();
    const tm = setTimeout(()=> ac.abort(), 45_000);

    try {
      const res = await fetch("/api/hats/step", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          userId,
          mode: currentHat,
          transcript: turns.map(t => ({ hat: t.hat, content: t.content })),
          context: ctx,
        }),
        signal: ac.signal,
      });

      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* zostaw text surowy */ }

      if(!res.ok){
        const msg = data?.error || data?.message || text || "Błąd kroku Hats";
        setErr(String(msg));
        return;
      }

      const newTurn: Turn = { hat: currentHat, content: data.content, context: ctx };
      setTurns(prev => [...prev, newTurn]);
    } catch (e:any) {
      if (e?.name === "AbortError") {
        setErr("Przekroczono czas oczekiwania (timeout). Spróbuj ponownie.");
      } else {
        setErr(e?.message || "Wystąpił nieoczekiwany błąd połączenia.");
      }
    } finally {
      clearTimeout(tm);
      setBusy(false);
    }
  }, [userId, currentHat, turns, inputs, busy]);

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {seq.map((h, idx)=>(
          <StepBadge
            key={h}
            label={HAT_LABEL[h]}
            active={idx===currentIndex}
            done={idx<currentIndex}
          />
        ))}
      </div>

      {/* Formularz aktywnego kapelusza */}
      {currentHat && (
        <div className="rounded-2xl bg-white border border-zinc-200 p-4 space-y-3">
          <div className="text-sm font-semibold">{HAT_LABEL[currentHat]}</div>

          {currentHat==="blue_start" && (
            <div className="grid gap-2">
              <textarea className="input min-h-[80px]" placeholder="Cel / problem do przeanalizowania"
                value={inputs.goal} onChange={e=> setInputs(s=>({...s, goal:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Ograniczenia / zasoby"
                value={inputs.constraints} onChange={e=> setInputs(s=>({...s, constraints:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Kryteria sukcesu"
                value={inputs.success} onChange={e=> setInputs(s=>({...s, success:e.target.value}))} />
            </div>
          )}

          {currentHat==="white" && (
            <div className="grid gap-2">
              <textarea className="input min-h-[60px]" placeholder="Mamy – fakty/dane"
                value={inputs.facts} onChange={e=> setInputs(s=>({...s, facts:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Luki – czego brakuje"
                value={inputs.gaps} onChange={e=> setInputs(s=>({...s, gaps:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Skąd pozyskać"
                value={inputs.sources} onChange={e=> setInputs(s=>({...s, sources:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Założenia/liczby"
                value={inputs.assumptions} onChange={e=> setInputs(s=>({...s, assumptions:e.target.value}))} />
            </div>
          )}

          {currentHat==="red" && (
            <div className="grid gap-2">
              <textarea className="input min-h-[60px]" placeholder="Moje odczucia (bez uzasadnień)"
                value={inputs.feelings} onChange={e=> setInputs(s=>({...s, feelings:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Możliwe reakcje interesariuszy"
                value={inputs.reactions} onChange={e=> setInputs(s=>({...s, reactions:e.target.value}))} />
            </div>
          )}

          {currentHat==="yellow" && (
            <div className="grid gap-2">
              <textarea className="input min-h-[60px]" placeholder="Korzyści krótkoterminowe"
                value={inputs.short} onChange={e=> setInputs(s=>({...s, short:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Korzyści średnioterminowe"
                value={inputs.mid} onChange={e=> setInputs(s=>({...s, mid:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Korzyści długoterminowe"
                value={inputs.long} onChange={e=> setInputs(s=>({...s, long:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Best case / wskaźniki"
                value={inputs.best} onChange={e=> setInputs(s=>({...s, best:e.target.value}))} />
            </div>
          )}

          {currentHat==="black" && (
            <div className="grid gap-2">
              <textarea className="input min-h-[60px]" placeholder="Ryzyka"
                value={inputs.risks} onChange={e=> setInputs(s=>({...s, risks:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Czarne scenariusze"
                value={inputs.worst} onChange={e=> setInputs(s=>({...s, worst:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Zabezpieczenia / mitigations"
                value={inputs.mitigations} onChange={e=> setInputs(s=>({...s, mitigations:e.target.value}))} />
            </div>
          )}

          {currentHat==="green" && (
            <div className="grid gap-2">
              <textarea className="input min-h-[60px]" placeholder="Pomysły (warianty)"
                value={inputs.ideas} onChange={e=> setInputs(s=>({...s, ideas:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Zastosowane metody (np. SCAMPER)"
                value={inputs.methods} onChange={e=> setInputs(s=>({...s, methods:e.target.value}))} />
              <textarea className="input min-h-[60px]" placeholder="Szybkie testy"
                value={inputs.tests} onChange={e=> setInputs(s=>({...s, tests:e.target.value}))} />
            </div>
          )}

          {currentHat==="blue_final" && (
            <div className="text-sm text-zinc-600">
              Kliknij „Generuj syntezę”, aby zamknąć proces kapeluszem Blue (finał).
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button className="btn bg-ink text-white" onClick={sendStep} disabled={busy || !canProceed}>
              {currentHat === "blue_final" ? "Generuj syntezę" : "Dalej"}
            </button>
            {busy && <div className="text-xs text-zinc-500">pracuję…</div>}
          </div>

          {err && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
        </div>
      )}

      {/* Transkrypt */}
      {turns.length > 0 && (
        <div className="space-y-3">
          {turns.map((t, i)=>(
            <div key={i}>
              <div className="mb-1 text-xs font-semibold text-zinc-600">{HAT_LABEL[t.hat]}</div>
              <Bubble role="assistant">
                <div className="prose prose-zinc max-w-none whitespace-pre-wrap">{t.content}</div>
              </Bubble>
            </div>
          ))}
          {!nextHat && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              Zakończono sekwencję Hats. Możesz skopiować wynik lub rozpocząć nową sesję.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HatsFlow;
