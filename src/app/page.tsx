'use client';
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { AssistantSelector } from "@/components/AssistantSelector";
import { Bubble } from "@/components/MessageBubble";
import { TaskCard } from "@/components/TaskCard";
import type { AssistantId } from "@/assistants/types";
import { assistants } from "@/assistants/config";

type Msg = { role:'user'|'assistant'; content:string; toolResult?:any };

export default function Home(){
  const sb = supabaseBrowser();
  const [session, setSession] = useState<any>(null);
  const [assistant, setAssistant] = useState<AssistantId>('todoist');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [connectingTodoist, setConnectingTodoist] = useState(false);

  useEffect(()=>{
    sb.auth.getSession().then(({data})=> setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e,s)=> setSession(s));
    return ()=> sub.subscription.unsubscribe();
  },[]);

  const userId = session?.user?.id as string | undefined;

  const connectTodoist = ()=>{
    if(!userId) return;
    setConnectingTodoist(true);
    const url = `/api/todoist/connect?uid=${userId}`;
    window.location.href = url;
  };
  const disconnectTodoist = async ()=>{
    if(!userId) return;
    await fetch("/api/todoist/disconnect", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId }) });
    alert("Odłączono Todoist.");
  };
  const send = async ()=>{
    if(!input.trim() || !userId) return;
    const myMsg: Msg = { role:'user', content: input.trim() };
    setMessages(m=>[...m,myMsg]); setInput('');
    const res = await fetch("/api/chat", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ assistantId: assistant, messages: [...messages, myMsg], userId })
    });
    const data = await res.json();
    const a: Msg = { role:'assistant', content: data.content, toolResult: data.toolResult };
    setMessages(m=>[...m,a]);
  };

  if(!session){
    const SignIn = require("@/components/SignIn").SignIn;
    return <SignIn />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <header className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">ZenON</div>
          <div className="text-sm text-zinc-600">Asystenci ADHD & anty-prokrastynacja</div>
        </div>
        <div className="flex gap-2 items-center">
          <AssistantSelector value={assistant} onChange={setAssistant} />
          <button className="btn bg-accent text-white" onClick={connectTodoist} disabled={!userId || connectingTodoist}>
            {connectingTodoist ? "Łączenie..." : "Połącz Todoist"}
          </button>
          <button className="btn bg-white" onClick={disconnectTodoist}>Odłącz</button>
        </div>
      </header>

      <main className="space-y-4">
        {messages.map((m,i)=> (
          <div key={i} className="space-y-2">
            <Bubble role={m.role}><div className="prose prose-zinc max-w-none"><pre className="whitespace-pre-wrap">{m.content}</pre></div></Bubble>
            {m.toolResult && Array.isArray(m.toolResult) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {m.toolResult.map((t:any)=> <TaskCard key={t.id} t={t} />)}
              </div>
            )}
            {m.toolResult && m.toolResult.moved && (
              <div className="text-sm text-zinc-600">Przeniesiono {m.toolResult.moved} zadań na dziś.</div>
            )}
          </div>
        ))}
      </main>

      <footer className="sticky bottom-0 bg-soft py-2">
        <div className="flex gap-2">
          <input className="input"
            placeholder={assistant==='hats' ? "Opisz dylemat – zacznijmy pytaniami." : "Napisz, co chcesz zrobić (np. „Pokaż dzisiejsze zadania”)."}
            value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=> e.key==='Enter' ? send() : null}
          />
          <button className="btn bg-ink text-white" onClick={send}>Wyślij</button>
        </div>
      </footer>
    </div>
  );
}
