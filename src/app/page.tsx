'use client';
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { AssistantSelector } from "@/components/AssistantSelector";
import { Bubble } from "@/components/MessageBubble";
import { TaskCard } from "@/components/TaskCard";
import { GroupedTasks } from "@/components/GroupedTasks";
import { GroupedByProject } from "@/components/GroupedByProject";
import type { AssistantId } from "@/assistants/types";

type Msg = { role:'user'|'assistant'; content:string; toolResult?:any };
const stripTool = (t:string)=> t.replace(/```tool[\s\S]*?```/g,"").trim();

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

  const lastTasks = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (Array.isArray(m.toolResult)) return m.toolResult as any[];
      if (m.toolResult?.groups && m.toolResult?.tasks) return m.toolResult.tasks as any[];
    }
    return [] as any[];
  }, [messages]);

  const connectTodoist = ()=>{
    if(!userId) return;
    setConnectingTodoist(true);
    window.location.href = `/api/todoist/connect?uid=${userId}`;
  };
  const disconnectTodoist = async ()=>{
    if(!userId) return;
    await fetch("/api/todoist/disconnect", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId })
    });
    alert("Odłączono Todoist.");
  };

  async function sendMsg(text: string){
    if(!text.trim() || !userId) return;
    const myMsg: Msg = { role:'user', content: text.trim() };
    setMessages(m=>[...m,myMsg]);
    const res = await fetch("/api/chat", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ assistantId: assistant, messages: [...messages, myMsg], userId, contextTasks: lastTasks })
    });
    const data = await res.json();

    const toolResult =
      data && typeof data.toolResult === "object" && data.toolResult !== null && "result" in data.toolResult
        ? (data.toolResult.result as any)
        : data.toolResult;

    setMessages(m=>[...m, { role:'assistant', content: stripTool(data.content||""), toolResult }]);
  }

  const send = async ()=>{
    if(!input.trim()) return;
    const txt = input; setInput('');
    await sendMsg(txt);
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

      <div className="flex flex-wrap gap-2">
        <button className="btn bg-ink text-white text-sm" onClick={()=>sendMsg("daj taski na dzisiaj")}>daj taski na dzisiaj</button>
        <button className="btn bg-ink text-white text-sm" onClick={()=>sendMsg("daj przeterminowane")}>daj przeterminowane</button>
        <button className="btn bg-white text-sm" onClick={()=> setMessages(m=>[...m,{ role:"assistant", content:"Grupuję wg projektów…", toolResult:{ groupByProject:true, tasks:lastTasks } }])}>grupuj wg projektu</button>
        <button className="btn bg-white text-sm" onClick={()=>sendMsg("zaproponuj kolejność")}>zaproponuj kolejność</button>
      </div>

      <main className="space-y-4">
        {messages.map((m, i) => (
          <div key={i} className="space-y-2">
            <Bubble role={m.role}>
              <div className="prose prose-zinc max-w-none">
                <pre className="whitespace-pre-wrap">{stripTool(m.content)}</pre>
              </div>
            </Bubble>

            {m.toolResult && Array.isArray(m.toolResult) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {m.toolResult.map((t: any) => (
                  <TaskCard key={t.id} t={t} userId={userId} />
                ))}
              </div>
            )}

            {m.toolResult?.groups && m.toolResult?.tasks && (
              <GroupedTasks groups={m.toolResult.groups} tasks={m.toolResult.tasks} userId={userId} />
            )}

            {m.toolResult?.groupByProject && m.toolResult?.tasks && (
              <GroupedByProject tasks={m.toolResult.tasks} userId={userId} />
            )}

            {m.toolResult?.plan && m.toolResult?.tasks && (
              <div className="space-y-2">
                <div className="text-sm text-zinc-700 px-1">Plan wykonania (kolejność):</div>
                <ol className="list-decimal pl-6 space-y-1">
                  {m.toolResult.plan.order?.map((id:string)=> {
                    const t = (m.toolResult.tasks as any[]).find((x)=> String(x.id)===String(id));
                    return <li key={id}>{t ? t.content : id}</li>;
                  })}
                </ol>
                {m.toolResult.plan.notes && <div className="text-xs text-zinc-500 px-1">{m.toolResult.plan.notes}</div>}
              </div>
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
