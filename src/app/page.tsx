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
import { ChatSidebar } from "@/components/ChatSidebar";
import {
  makeChat, loadChats, saveChats, updateTitleFromFirstUserMessage,
  type Chat, type Msg as ChatMsg
} from "@/lib/chatStore";
import { HatsFlow } from "@/components/HatsFlow";

type Msg = ChatMsg;
const stripTool = (t:string)=> t.replace(/```tool[\s\S]*?```/g,"").trim();

export default function Home(){
  const sb = supabaseBrowser();

  // auth
  const [session, setSession] = useState<any>(null);
  useEffect(()=>{
    let mounted = true;
    sb.auth.getSession().then(({data})=> mounted && setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e,s)=> setSession(s));
    return ()=> { sub.subscription.unsubscribe(); mounted = false; };
  },[]);
  const userId = session?.user?.id as string | undefined;

  // assistant
  const [assistant, setAssistant] = useState<AssistantId>('todoist');

  // chats per assistant (dla Todoist – zachowujemy, Hats ma własny flow)
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((text: string, type?: Toast['type'])=>{
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, text, type }]);
  },[]);
  const dropToast = useCallback((id:string)=>{
    setToasts(ts => ts.filter(t=>t.id !== id));
  },[]);

  // ładowanie historii tylko dla todoist
  useEffect(()=>{
    if(!userId) return;
    if(assistant !== 'todoist') return;
    const arr = loadChats(userId, assistant);
    if(arr.length === 0){
      const c = makeChat(assistant);
      setChats([c]);
      setActiveChatId(c.id);
      saveChats(userId, assistant, [c]);
    } else {
      setChats(arr);
      const last = [...arr].sort((a,b)=> b.updatedAt - a.updatedAt)[0];
      setActiveChatId(last?.id);
    }
  }, [userId, assistant]);

  const persist = useCallback((next: Chat[])=>{
    if(!userId) return;
    setChats(next);
    saveChats(userId, 'todoist', next);
  }, [userId]);

  const activeChat = useMemo(()=> chats.find(c=> c.id === activeChatId), [chats, activeChatId]);
  const messages = activeChat?.messages ?? [];

  // snapshot zadań (dla LLM context – tylko todoist)
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
    const idx = chats.findIndex(c=> c.id === activeChatId);
    if(idx === -1) return;
    const c = chats[idx];
    const copy = [...chats];
    const msgs = [...c.messages];
    const m = msgs[msgIndex]; if(!m) return;
    const tr = m.toolResult;

    if (Array.isArray(tr)) {
      m.toolResult = tr.filter((t:any)=> String(t.id) !== String(taskId));
    } else if (tr?.tasks && tr?.groups) {
      m.toolResult = { ...tr, tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)),
        groups: tr.groups.map((g:any)=> ({...g, task_ids: g.task_ids.filter((id:string)=> String(id)!==String(taskId))})) };
    } else if (tr?.groupByProject && tr?.tasks) {
      m.toolResult = { ...tr, tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)) };
    } else if (tr?.week && tr?.tasks) {
      m.toolResult = { ...tr, tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)) };
    }

    msgs[msgIndex] = { ...m };
    const updated = { ...c, messages: msgs, updatedAt: Date.now() };
    copy[idx] = updated; persist(copy);
  }, [chats, activeChatId, persist]);

  // connect/disconnect todoist
  const [connectingTodoist, setConnectingTodoist] = useState(false);
  const connectTodoist = ()=>{
    if(!userId) { pushToast("Najpierw zaloguj się.", "error"); return; }
    setConnectingTodoist(true);
    window.location.href = `/api/todoist/connect?uid=${userId}`;
  };
  const disconnectTodoist = async ()=>{
    if(!userId) { pushToast("Najpierw zaloguj się.", "error"); return; }
    await fetch("/api/todoist/disconnect", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId })
    });
    pushToast("Odłączono Todoist.", "success");
  };

  const abs = (path: string) =>
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  const pushUser = useCallback((text: string)=>{
    const idx = chats.findIndex(c=> c.id === activeChatId);
    if(idx === -1) return;
    const c = chats[idx];
    const msgs = [...c.messages, { role:'user' as const, content: text }];
    const updatedBase = { ...c, messages: msgs, updatedAt: Date.now() };
    const updated = c.title === "Nowy czat" ? updateTitleFromFirstUserMessage(updatedBase) : updatedBase;
    const arr = [...chats]; arr[idx] = updated; persist(arr);
  }, [chats, activeChatId, persist]);

  const pushAssistant = useCallback((content: string, toolResult?: any)=>{
    const idx = chats.findIndex(c=> c.id === activeChatId);
    if(idx === -1) return;
    const c = chats[idx];
    const msgs = [...c.messages, { role:'assistant' as const, content, toolResult }];
    const updated = { ...c, messages: msgs, updatedAt: Date.now() };
    const arr = [...chats]; arr[idx] = updated; persist(arr);
  }, [chats, activeChatId, persist]);

  async function quickFetch(
    action: "get_today_tasks" | "get_tomorrow_tasks" | "get_week_tasks" | "get_overdue_tasks"
  ) {
    if (!userId) { pushToast("Brak userId – zaloguj się ponownie.", "error"); return; }
    try {
      const res = await fetch(abs("/api/todoist/actions"), {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ userId, action, payload: {} }),
        cache:"no-store",
      });
      if (!res.ok) {
        const t = await res.text().catch(()=> "");
        pushToast(`Błąd pobierania: ${t}`, "error");
        return;
      }
      const data = await res.json();
      const result = data?.result ?? data;

      if (action === "get_week_tasks") {
        pushAssistant("Plan na ten tydzień (pogrupowany wg dni):", { week:true, tasks: result });
      } else if (action === "get_tomorrow_tasks") {
        pushAssistant("Oto Twoje zadania na jutro:", result);
      } else if (action === "get_overdue_tasks") {
        pushAssistant("Oto Twoje przeterminowane zadania:", result);
      } else {
        pushAssistant("Oto Twoje zadania na dziś:", result);
      }
    } catch (e:any) {
      pushToast(`Błąd pobierania: ${e?.message || "unknown"}`, "error");
    }
  }

  async function sendMsg(text: string){
    if(!text.trim() || !userId) { pushToast("Brak userId – zaloguj się ponownie.", "error"); return; }
    pushUser(text.trim());
    const res = await fetch(abs("/api/chat"), {
      method:"POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        assistantId: assistant,
        messages: [...(activeChat?.messages ?? []), { role:'user', content: text.trim() }],
        userId,
        contextTasks: (()=>{
          for (let i = (activeChat?.messages?.length ?? 0)-1; i>=0; i--){
            const m = activeChat!.messages[i]!;
            if (Array.isArray(m.toolResult)) return m.toolResult as any[];
            if (m.toolResult?.groups && m.toolResult?.tasks) return m.toolResult.tasks as any[];
            if (m.toolResult?.tasks && m.toolResult?.week) return m.toolResult.tasks as any[];
          }
          return [];
        })()
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(()=> "");
      pushToast(`Chat error: ${t}`, "error");
      return;
    }
    const data = await res.json();
    const toolResult =
      data && typeof data.toolResult === "object" && data.toolResult !== null && "result" in data.toolResult
        ? (data.toolResult.result as any)
        : data.toolResult;
    pushAssistant(stripTool(data.content||""), toolResult);
  }

  // sign-in
  if(!session){
    const SignIn = require("@/components/SignIn").SignIn;
    return <SignIn />;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sidebar: tylko dla Todoist (Hats ma własny stepper flow bez historii chatów) */}
        {assistant === 'todoist' && (
          <ChatSidebar
            chats={chats}
            activeId={activeChatId}
            onSelect={setActiveChatId}
            onNew={()=>{
              const c = makeChat('todoist'); const arr = [c, ...chats]; persist(arr); setActiveChatId(c.id);
            }}
            onRename={(id, title)=> persist(chats.map(c=> c.id===id? {...c, title, updatedAt: Date.now()} : c))}
            onDelete={(id)=>{
              const arr = chats.filter(c=> c.id !== id); persist(arr);
              if (activeChatId === id) {
                if (arr.length) setActiveChatId(arr[0].id);
                else { const c = makeChat('todoist'); persist([c]); setActiveChatId(c.id); }
              }
            }}
          />
        )}

        <div className="flex-1 space-y-4">
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

          {assistant === 'hats' ? (
            <HatsFlow userId={userId!} />
          ) : (
            <>
              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_today_tasks")} disabled={!userId}>dzisiaj</button>
                <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_tomorrow_tasks")} disabled={!userId}>jutro</button>
                <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_week_tasks")} disabled={!userId}>tydzień</button>
                <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_overdue_tasks")} disabled={!userId}>przeterminowane</button>
              </div>

              {/* Thread */}
              <main className="space-y-4">
                {(activeChat?.messages ?? []).map((m, i) => (
                  <div key={i} className="space-y-2">
                    <Bubble role={m.role}>
                      <div className="prose prose-zinc max-w-none">
                        <pre className="whitespace-pre-wrap">{stripTool(m.content)}</pre>
                      </div>
                    </Bubble>

                    {m.toolResult && Array.isArray(m.toolResult) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {m.toolResult.map((t: any) => (
                          <TaskCard
                            key={t.id}
                            t={t}
                            userId={userId}
                            onRemoved={(id)=> removeTaskFromMessage(i, id)}
                            notify={(txt,type)=> setToasts(ts=> [...ts, { id: Math.random().toString(36).slice(2), text: txt, type }])}
                            onAsk={(txt)=> sendMsg(txt)}
                          />
                        ))}
                      </div>
                    )}

                    {m.toolResult?.groups && m.toolResult?.tasks && (
                      <GroupedTasks
                        groups={m.toolResult.groups}
                        tasks={m.toolResult.tasks}
                        userId={userId}
                        onRemoved={(id)=> removeTaskFromMessage(i, id)}
                        notify={(txt,type)=> setToasts(ts=> [...ts, { id: Math.random().toString(36).slice(2), text: txt, type }])}
                      />
                    )}

                    {m.toolResult?.groupByProject && m.toolResult?.tasks && (
                      <GroupedByProject
                        tasks={m.toolResult.tasks}
                        userId={userId}
                        onRemoved={(id)=> removeTaskFromMessage(i, id)}
                        notify={(txt,type)=> setToasts(ts=> [...ts, { id: Math.random().toString(36).slice(2), text: txt, type }])}
                      />
                    )}

                    {m.toolResult?.week && m.toolResult?.tasks && (
                      <GroupedByDay
                        tasks={m.toolResult.tasks}
                        userId={userId}
                        onRemoved={(id)=> removeTaskFromMessage(i, id)}
                        notify={(txt,type)=> setToasts(ts=> [...ts, { id: Math.random().toString(36).slice(2), text: txt, type }])}
                      />
                    )}
                  </div>
                ))}
              </main>

              {/* Composer */}
              <footer className="sticky bottom-0 bg-soft py-2">
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Napisz, co chcesz zrobić (np. „Pokaż jutrzejsze zadania”)."
                    onKeyDown={(e)=> e.key==='Enter' ? (async ()=>{
                      const target = e.target as HTMLInputElement;
                      const txt = target.value;
                      (e.target as HTMLInputElement).value = '';
                      await sendMsg(txt);
                    })() : null}
                  />
                  <button
                    className="btn bg-ink text-white"
                    onClick={async ()=>{
                      const el = document.querySelector<HTMLInputElement>('input.input');
                      const txt = el?.value?.trim() || "";
                      if(!txt) return;
                      if(el) el.value='';
                      await sendMsg(txt);
                    }}
                    disabled={!userId}
                  >
                    Wyślij
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>

      <Toasts items={toasts} onDone={(id)=> setToasts(ts=> ts.filter(t=> t.id !== id))} />
    </div>
  );
}
