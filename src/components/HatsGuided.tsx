'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_SEQUENCE, HAT_LABEL, type HatMode } from "@/assistants/hats/prompt";

type Msg = { role: "user" | "assistant"; content: string; hat?: HatMode };

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={[
        "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm border",
        isUser ? "bg-indigo-600 text-white border-indigo-600"
               : "bg-white text-zinc-800 border-zinc-200"
      ].join(" ")}>
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="px-2 py-1 text-xs text-zinc-500">
      <span className="inline-flex gap-1">
        <span className="animate-bounce">●</span>
        <span className="animate-bounce [animation-delay:120ms]">●</span>
        <span className="animate-bounce [animation-delay:240ms]">●</span>
      </span>
    </div>
  );
}

export default function HatsGuided({ userId }: { userId: string }) {
  // aktywny kapelusz
  const [hat, setHat] = useState<HatMode>("blue_start");
  // rozmowa
  const [messages, setMessages] = useState<Msg[]>([]);
  // input
  const [input, setInput] = useState("");
  // status
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [readyToSynthesize, setReadyToSynthesize] = useState(false);
  const [context, setContext] = useState("");

  // historia
  const [sessions, setSessions] = useState<Array<{id:string; title:string|null; created_at:string}>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // autoscroll
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const transcript = useMemo(()=>messages, [messages]);

  /** ---------- Historia: API helpers ---------- */
  const fetchSessions = useCallback(async ()=>{
    const r = await fetch(`/api/hats/sessions/list?userId=${encodeURIComponent(userId)}`);
    const data = await r.json();
    if (r.ok) setSessions(data.sessions ?? []);
  }, [userId]);

  const createSession = useCallback(async (title?: string)=>{
    const r = await fetch("/api/hats/sessions/create", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId, title })
    });
    const data = await r.json();
    if (r.ok) {
      setSessionId(data.session.id);
      await fetchSessions();
    }
  }, [userId, fetchSessions]);

  const loadSession = useCallback(async (id: string)=>{
    const r = await fetch(`/api/hats/sessions/get?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`);
    const data = await r.json();
    if (!r.ok) return;
    setSessionId(id);
    // wczytaj wiadomości
    const msgs: Msg[] = (data.messages ?? []).map((m:any)=>({ role: m.role, content: m.content, hat: m.hat || undefined }));
    setMessages(msgs);
    setStarted(true);
    // heurystyka: ustaw kapelusz na ostatni hat z asystenta, albo blue_start
    const lastHat = [...msgs].reverse().find(m=>m.hat)?.hat || "blue_start";
    setHat(lastHat as HatMode);
  }, [userId]);

  const deleteSession = useCallback( async (id: string)=>{
    await fetch("/api/hats/sessions/delete", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ sessionId:id, userId })
    });
    if (sessionId === id) {
      setSessionId(null);
      setMessages([]);
      setStarted(false);
      setHat("blue_start");
    }
    await fetchSessions();
  }, [sessionId, userId, fetchSessions]);

  const appendMessage = useCallback(async (msg: Msg)=>{
    if (!sessionId) return;
    await fetch("/api/hats/sessions/append", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        sessionId, userId, role: msg.role, hat: msg.hat ?? null, content: msg.content
      })
    });
  }, [sessionId, userId]);

  useEffect(()=>{ fetchSessions(); }, [fetchSessions]);

  /** ---------- QA – pytania po jednym ---------- */
  const askNext = useCallback(async (currentHat: HatMode)=>{
    setBusy(true);
    try{
      const r = await fetch("/api/hats/qa", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ hat: currentHat, transcript, context: context || undefined })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "QA failed");

      const msg: Msg = { role:"assistant", content: data.question, hat: currentHat };
      setMessages(prev=> [...prev, msg]);
      appendMessage(msg);

      if (data.advance === true) {
        if (data.nextHat) {
          const next = data.nextHat as HatMode;
          setHat(next);
          const jump: Msg = { role:"assistant", hat: next, content:`→ Przechodzimy do: ${HAT_LABEL[next]}` };
          setMessages(prev=> [...prev, jump]);
          appendMessage(jump);
          setTimeout(()=> askNext(next), 250);
        } else {
          setReadyToSynthesize(true);
        }
      }
    }catch(e:any){
      const err: Msg = { role:"assistant", content:`Błąd: ${e.message}`, hat: currentHat };
      setMessages(prev=> [...prev, err]);
      appendMessage(err);
    }finally{
      setBusy(false);
    }
  }, [transcript, context, appendMessage]);

  const start = useCallback(async ()=>{
    if (started) return;
    setStarted(true);
    if (!sessionId) await createSession(context ? context.slice(0,60) : "Nowa analiza");
    if (context.trim()){
      const m: Msg = { role:"user", content: context.trim() };
      setMessages(prev=> [...prev, m]);
      appendMessage(m);
    }
    askNext("blue_start");
  }, [started, sessionId, context, createSession, appendMessage, askNext]);

  const send = useCallback(()=>{
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    const m: Msg = { role:"user", content:text };
    setMessages(prev=> [...prev, m]);
    appendMessage(m);
    askNext(hat);
  }, [input, busy, hat, appendMessage, askNext]);

  const synthesize = useCallback(async ()=>{
    setBusy(true);
    try{
      const r = await fetch("/api/hats/synthesize", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ transcript, context })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Synthesis failed");
      const m: Msg = { role:"assistant", content: data.content, hat:"blue_final" };
      setMessages(prev=> [...prev, m]);
      appendMessage(m);
      setReadyToSynthesize(false);
      setHat("blue_final");
    }catch(e:any){
      const err: Msg = { role:"assistant", content:`Błąd syntezy: ${e.message}`, hat:"blue_final" };
      setMessages(prev=> [...prev, err]);
      appendMessage(err);
    }finally{
      setBusy(false);
    }
  }, [transcript, context, appendMessage]);

  /** ---------- UI ---------- */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Panel historii */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 h-[76vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Historia rozmów</div>
          <button
            className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={()=> createSession("Nowa analiza")}
          >
            + Nowa
          </button>
        </div>
        <div className="space-y-1">
          {sessions.map(s=>(
            <div
              key={s.id}
              className={[
                "flex items-center justify-between gap-2 rounded-lg border px-2 py-2 text-sm cursor-pointer",
                sessionId===s.id ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 hover:bg-zinc-50"
              ].join(" ")}
              onClick={()=> loadSession(s.id)}
            >
              <div className="truncate">{s.title || "Bez tytułu"}</div>
              <button
                onClick={(e)=>{ e.stopPropagation(); deleteSession(s.id); }}
                className="text-[11px] text-red-600 hover:underline"
              >
                usuń
              </button>
            </div>
          ))}
          {sessions.length===0 && (
            <div className="text-xs text-zinc-500">Brak rozmów. Utwórz nową.</div>
          )}
        </div>
      </div>

      {/* Główna kolumna */}
      <div className="max-w-3xl mx-auto w-full space-y-4">
        {/* Pasek kapeluszy */}
        <div className="relative flex flex-wrap gap-6 items-center">
          {DEFAULT_SEQUENCE.map((h)=>(
            <div key={h} className="relative">
              <motion.div
                layout
                className={[
                  "px-3 py-1 rounded-full text-xs border transition-colors",
                  hat===h ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-zinc-700 border-zinc-200"
                ].join(" ")}
              >
                {HAT_LABEL[h]}
              </motion.div>
              {hat===h && (
                <motion.div layoutId="underline" className="absolute left-0 right-0 -bottom-1 h-[3px] rounded-full bg-indigo-600" />
              )}
            </div>
          ))}
        </div>

        {/* Intro */}
        {!started && (
          <motion.div
            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
            className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3"
          >
            <div className="text-sm text-zinc-700">
              Napisz krótko dylemat (opcjonalnie), a potem kliknij <b>Start</b>.  
              Asystent poprowadzi Cię kapeluszami – <b>jedno pytanie naraz</b>.
            </div>
            <textarea
              placeholder="Np. Nie wiem, czy jechać dziś na mecz hokeja – jestem zawodnikiem, ale czuję zmęczenie."
              className="input min-h-[90px]"
              value={context}
              onChange={e=> setContext(e.target.value)}
            />
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={start}>
                Start
              </button>
            </div>
          </motion.div>
        )}

        {/* Chat */}
        {started && (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-3 h-[62vh] overflow-y-auto">
              <AnimatePresence initial={false}>
                {messages.map((m,i)=>(
                  <motion.div key={i} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.18 }} className="mb-2">
                    <Bubble role={m.role}>
                      {m.hat && <div className="text-[10px] opacity-60 mb-1">{HAT_LABEL[m.hat]}</div>}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </Bubble>
                  </motion.div>
                ))}
              </AnimatePresence>
              {busy && <TypingDots />}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e=> setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); send(); } }}
                placeholder="Napisz odpowiedź…"
                className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={busy}
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Wyślij
              </button>
            </div>

            {/* Finał */}
            {readyToSynthesize && (
              <div className="flex justify-end">
                <button
                  onClick={synthesize}
                  disabled={busy}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Generuj syntezę
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
