'use client';
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { AssistantSelector } from "@/components/AssistantSelector";
import { Bubble } from "@/components/MessageBubble";
import { TaskCard } from "@/components/TaskCard";
import { GroupedTasks } from "@/components/GroupedTasks";
import { GroupedByProject } from "@/components/GroupedByProject";
import { GroupedByDay } from "@/components/GroupedByDay";
import { Toasts, type Toast } from "@/components/Toast";
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
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(()=>{
    sb.auth.getSession().then(({data})=> setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e,s)=> setSession(s));
    return ()=> sub.subscription.unsubscribe();
  },[]);

  const userId = session?.user?.id as string | undefined;

  const pushToast = useCallback((text: string, type?: Toast['type'])=>{
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, text, type }]);
  },[]);
  const dropToast = useCallback((id:string)=>{
    setToasts(ts => ts.filter(t=>t.id !== id));
  },[]);

  const lastTasks = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (Array.isArray(m.toolResult)) return m.toolResult as any[];
      if (m.toolResult?.groups && m.toolResult?.tasks) return m.toolResult.tasks as any[];
      if (m.toolResult?.tasks && m.toolResult?.week) return m.toolResult.tasks as any[];
    }
    return [] as any[];
  }, [messages]);

  const removeTaskFromMessage = useCallback((msgIndex: number, taskId: string)=>{
    setMessages(prev => {
      const copy = [...prev];
      const m = copy[msgIndex];
      if (!m) return prev;
      const tr = m.toolResult;

      if (Array.isArray(tr)) {
        m.toolResult = tr.filter((t:any)=> String(t.id) !== String(taskId));
      } else if (tr?.tasks && tr?.groups) {
        m.toolResult = {
          ...tr,
          tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)),
          groups: tr.groups.map((g:any)=> ({...g, task_ids: g.task_ids.filter((id:string)=> String(id)!==String(taskId))})),
        };
      } else if (tr?.groupByProject && tr?.tasks) {
        m.toolResult = {
          ...tr,
          tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)),
        };
      } else if (tr?.week && tr?.tasks) {
        m.toolResult = {
          ...tr,
          tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)),
        };
      }
      copy[msgIndex] = { ...m };
      return copy;
    });
  },[]);

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
    pushToast("Odłączono Todoist.", "success");
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
          {assistant === 'todoist' && (
            <>
              <button className="btn bg-accent text-white" onClick={connectTodoist} disabled={!userId || connectingTodoist}>
                {connectingTodoist ? "Łączenie..." : "Połącz Todoist"}
              </button>
              <button className="btn bg-white" onClick={disconnectTodoist}>Odłącz</button>
            </>
          )}
        </div>
      </header>

      {/* Szybkie akcje */}
      <div className="flex flex-wrap gap-2">
        {assistant === 'todoist' && (
          <>
            <button className="btn bg-ink text-white text-sm" onClick={()=>sendMsg("daj taski na dzisiaj")}>dzisiaj</button>
            <button className="btn bg-ink text-white text-sm" onClick={()=>sendMsg("daj taski na jutro")}>jutro</button>
            <button className="btn bg-ink text-white text-sm" onClick={()=>sendMsg("daj taski na ten tydzień")}>tydzień</button>
            <button className="btn bg-ink text-white text-sm" onClick={()=>sendMsg("daj przeterminowane")}>przeterminowane</button>
          </>
        )}
      </div>

      <main className="space-y-4">
        {messages.map((m, i) => (
          <div key={i} className="space-y-2">
            <Bubble role={m.role}>
              <div className="prose prose-zinc max-w-none">
                <pre className="whitespace-pre-wrap">{stripTool(m.content)}</pre>
              </div>
            </Bubble>

            {/* Zwykła lista */}
            {m.toolResult && Array.isArray(m.toolResult) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {m.toolResult.map((t: any) => (
                  <TaskCard
                    key={t.id}
                    t={t}
                    userId={userId}
                    onRemoved={(id)=> removeTaskFromMessage(i, id)}
                    notify={pushToast}
                  />
                ))}
              </div>
            )}

            {/* Grupowanie z LLM */}
            {m.toolResult?.groups && m.toolResult?.tasks && (
              <GroupedTasks
                groups={m.toolResult.groups}
                tasks={m.toolResult.tasks}
                userId={userId}
                onRemoved={(id)=> removeTaskFromMessage(i, id)}
                notify={pushToast}
              />
            )}

            {/* Lokalnie wg projektu */}
            {m.toolResult?.groupByProject && m.toolResult?.tasks && (
              <GroupedByProject
                tasks={m.toolResult.tasks}
                userId={userId}
                onRemoved={(id)=> removeTaskFromMessage(i, id)}
                notify={pushToast}
              />
            )}

            {/* Grupowanie wg dni tygodnia */}
            {m.toolResult?.week && m.toolResult?.tasks && (
              <GroupedByDay
                tasks={m.toolResult.tasks}
                userId={userId}
                onRemoved={(id)=> removeTaskFromMessage(i, id)}
                notify={pushToast}
              />
            )}
          </div>
        ))}
      </main>

      <footer className="sticky bottom-0 bg-soft py-2">
        <div className="flex gap-2">
          <input className="input"
            placeholder={assistant==='hats' ? "Opisz dylemat – zacznijmy pytaniami." : "Napisz, co chcesz zrobić (np. „Pokaż jutrzejsze zadania”)."}
            value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=> e.key==='Enter' ? send() : null}
          />
          <button className="btn bg-ink text-white" onClick={send}>Wyślij</button>
        </div>
      </footer>

      <Toasts items={toasts} onDone={dropToast} />
    </div>
  );
}
