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
  makeChat,
  loadChats,
  saveChats,
  updateTitleFromFirstUserMessage,
  type Chat,
  type Msg as ChatMsg
} from "@/lib/chatStore";

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

  // chats per assistant
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

  // load chats when user or assistant changes
  useEffect(()=>{
    if(!userId) return;
    const arr = loadChats(userId, assistant);
    if(arr.length === 0){
      const c = makeChat(assistant);
      setChats([c]);
      setActiveChatId(c.id);
      saveChats(userId, assistant, [c]);
    } else {
      setChats(arr);
      // prefer last updated chat
      const last = [...arr].sort((a,b)=> b.updatedAt - a.updatedAt)[0];
      setActiveChatId(last?.id);
    }
  }, [userId, assistant]);

  // helpers to persist
  const persist = useCallback((next: Chat[])=>{
    if(!userId) return;
    setChats(next);
    saveChats(userId, assistant, next);
  }, [userId, assistant]);

  // derive active chat & messages
  const activeChat = useMemo(()=> chats.find(c=> c.id === activeChatId), [chats, activeChatId]);
  const messages = activeChat?.messages ?? [];

  // last tasks snapshot (for LLM context)
  const lastTasks = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (Array.isArray(m.toolResult)) return m.toolResult as any[];
      if (m.toolResult?.groups && m.toolResult?.tasks) return m.toolResult.tasks as any[];
      if (m.toolResult?.tasks && m.toolResult?.week) return m.toolResult.tasks as any[];
    }
    return [] as any[];
  }, [messages]);

  // optimistic remove from a specific assistant message index
  const removeTaskFromMessage = useCallback((msgIndex: number, taskId: string)=>{
    const idx = chats.findIndex(c=> c.id === activeChatId);
    if(idx === -1) return;
    const c = chats[idx];
    const copy = [...chats];
    const msgs = [...c.messages];
    const m = msgs[msgIndex];
    if(!m) return;

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
      m.toolResult = { ...tr, tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)) };
    } else if (tr?.week && tr?.tasks) {
      m.toolResult = { ...tr, tasks: tr.tasks.filter((t:any)=> String(t.id) !== String(taskId)) };
    }

    msgs[msgIndex] = { ...m };
    const updated = { ...c, messages: msgs, updatedAt: Date.now() };
    copy[idx] = updated;
    persist(copy);
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

  // abs url
  const abs = (path: string) =>
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  // push message helpers
  const pushUser = useCallback((text: string)=>{
    const idx = chats.findIndex(c=> c.id === activeChatId);
    if(idx === -1) return;
    const c = chats[idx];
    const msgs = [...c.messages, { role:'user' as const, content: text }];
    // if first user message, propose title
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

  // quick actions (direct Todoist API)
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

  // chat via LLM
  async function sendMsg(text: string){
    if(!text.trim() || !userId) { pushToast("Brak userId – zaloguj się ponownie.", "error"); return; }
    pushUser(text.trim());

    const res = await fetch(abs("/api/chat"), {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        assistantId: assistant,
        messages: [...(activeChat?.messages ?? []), { role:'user', content: text.trim() }],
        userId,
        contextTasks: lastTasks
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

  // sidebar ops
  const onNewChat = ()=>{
    const c = makeChat(assistant);
    const arr = [c, ...chats];
    persist(arr);
    setActiveChatId(c.id);
  };

  const onSelectChat = (id: string)=> setActiveChatId(id);

  const onRenameChat = (id: string, title: string)=>{
    const arr = chats.map(c => c.id === id ? { ...c, title, updatedAt: Date.now() } : c);
    persist(arr);
  };

  const onDeleteChat = (id: string)=>{
    const arr = chats.filter(c => c.id !== id);
    persist(arr);
    if (activeChatId === id) {
      if (arr.length) setActiveChatId(arr[0].id);
      else {
        // make empty chat
        const c = makeChat(assistant);
        persist([c]);
        setActiveChatId(c.id);
      }
    }
  };

  // controlled input
  const [input, setInput] = useState('');

  // sign-in gate
  if(!session){
    const SignIn = require("@/components/SignIn").SignIn;
    return <SignIn />;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* SIDEBAR */}
        <ChatSidebar
          chats={chats}
          activeId={activeChatId}
          onSelect={onSelectChat}
          onNew={onNewChat}
          onRename={onRenameChat}
          onDelete={onDeleteChat}
        />

        {/* MAIN */}
        <div className="flex-1 space-y-4">
          <header className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">ZenON</div>
              <div className="text-sm text-zinc-600">Asystenci ADHD & anty-prokrastynacja</div>
            </div>

            <div className="flex gap-2 items-center">
              <AssistantSelector
                value={assistant}
                onChange={(a)=>{
                  setAssistant(a);
                  // po zmianie asystenta lista czatów załaduje się w useEffect
                }}
              />
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

          {/* Quick actions */}
          {assistant === 'todoist' && (
            <div className="flex flex-wrap gap-2">
              <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_today_tasks")} disabled={!userId}>dzisiaj</button>
              <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_tomorrow_tasks")} disabled={!userId}>jutro</button>
              <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_week_tasks")} disabled={!userId}>tydzień</button>
              <button className="btn bg-ink text-white text-sm" onClick={()=>quickFetch("get_overdue_tasks")} disabled={!userId}>przeterminowane</button>
            </div>
          )}

          {/* THREAD */}
          <main className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <Bubble role={m.role}>
                  <div className="prose prose-zinc max-w-none">
                    <pre className="whitespace-pre-wrap">{stripTool(m.content)}</pre>
                  </div>
                </Bubble>

                {/* plain list */}
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

                {/* grouped by LLM */}
                {m.toolResult?.groups && m.toolResult?.tasks && (
                  <GroupedTasks
                    groups={m.toolResult.groups}
                    tasks={m.toolResult.tasks}
                    userId={userId}
                    onRemoved={(id)=> removeTaskFromMessage(i, id)}
                    notify={(txt,type)=> setToasts(ts=> [...ts, { id: Math.random().toString(36).slice(2), text: txt, type }])}
                  />
                )}

                {/* grouped by project (local) */}
                {m.toolResult?.groupByProject && m.toolResult?.tasks && (
                  <GroupedByProject
                    tasks={m.toolResult.tasks}
                    userId={userId}
                    onRemoved={(id)=> removeTaskFromMessage(i, id)}
                    notify={(txt,type)=> setToasts(ts=> [...ts, { id: Math.random().toString(36).slice(2), text: txt, type }])}
                  />
                )}

                {/* grouped by week/day */}
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

          {/* composer */}
          <footer className="sticky bottom-0 bg-soft py-2">
            <div className="flex gap-2">
              <input
                className="input"
                placeholder={assistant==='hats' ? "Opisz dylemat – zacznijmy pytaniami." : "Napisz, co chcesz zrobić (np. „Pokaż jutrzejsze zadania”)."}
                value={input}
                onChange={(e)=>setInput(e.target.value)}
                onKeyDown={(e)=> e.key==='Enter' ? (async ()=>{ const txt=input; setInput(''); await sendMsg(txt); })() : null}
              />
              <button className="btn bg-ink text-white" onClick={async ()=>{ const txt=input; setInput(''); await sendMsg(txt); }} disabled={!userId}>
                Wyślij
              </button>
            </div>
          </footer>
        </div>
      </div>

      <Toasts items={toasts} onDone={(id)=> setToasts(ts=> ts.filter(t=> t.id !== id))} />
    </div>
  );
}
