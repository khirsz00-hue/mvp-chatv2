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

type Msg = { role: "user" | "assistant"; content: string; toolResult?: any };
const stripTool = (t: string) => t.replace(/```tool[\s\S]*?```/g, "").trim();

export default function Home() {
  const sb = supabaseBrowser();
  const [session, setSession] = useState<any>(null);
  const [assistant, setAssistant] = useState<AssistantId>("todoist");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [connectingTodoist, setConnectingTodoist] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // AUTH
  useEffect(() => {
    let mounted = true;
    sb.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id as string | undefined;

  // TOASTS
  const pushToast = useCallback((text: string, type?: Toast["type"]) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, text, type }]);
  }, []);
  const dropToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  // LAST TASK SNAPSHOT
  const lastTasks = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (Array.isArray(m.toolResult)) return m.toolResult as any[];
      if (m.toolResult?.groups && m.toolResult?.tasks) return m.toolResult.tasks as any[];
      if (m.toolResult?.tasks && m.toolResult?.week) return m.toolResult.tasks as any[];
    }
    return [] as any[];
  }, [messages]);

  // OPTIMISTIC REMOVE
  const removeTaskFromMessage = useCallback((msgIndex: number, taskId: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const m = copy[msgIndex];
      if (!m) return prev;
      const tr = m.toolResult;

      if (Array.isArray(tr)) {
        m.toolResult = tr.filter((t: any) => String(t.id) !== String(taskId));
      } else if (tr?.tasks && tr?.groups) {
        m.toolResult = {
          ...tr,
          tasks: tr.tasks.filter((t: any) => String(t.id) !== String(taskId)),
          groups: tr.groups.map((g: any) => ({
            ...g,
            task_ids: g.task_ids.filter((id: string) => String(id) !== String(taskId)),
          })),
        };
      } else if (tr?.groupByProject && tr?.tasks) {
        m.toolResult = { ...tr, tasks: tr.tasks.filter((t: any) => String(t.id) !== String(taskId)) };
      } else if (tr?.week && tr?.tasks) {
        m.toolResult = { ...tr, tasks: tr.tasks.filter((t: any) => String(t.id) !== String(taskId)) };
      }

      copy[msgIndex] = { ...m };
      return copy;
    });
  }, []);

  // TODOIST CONNECT/DISCONNECT
  const connectTodoist = () => {
    if (!userId) {
      pushToast("Najpierw zaloguj się.", "error");
      return;
    }
    setConnectingTodoist(true);
    window.location.href = `/api/todoist/connect?uid=${userId}`;
  };
  const disconnectTodoist = async () => {
    if (!userId) {
      pushToast("Najpierw zaloguj się.", "error");
      return;
    }
    await fetch("/api/todoist/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    pushToast("Odłączono Todoist.", "success");
  };

  // ABS URL helper (na Vercel/localhost)
  const abs = (path: string) =>
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  // DIRECT QUICK ACTIONS
  async function quickFetch(
    action: "get_today_tasks" | "get_tomorrow_tasks" | "get_week_tasks" | "get_overdue_tasks"
  ) {
    if (!userId) {
      pushToast("Brak userId – zaloguj się ponownie.", "error");
      return;
    }
    try {
      const res = await fetch(abs("/api/todoist/actions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, payload: {} }),
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        pushToast(`Błąd pobierania: ${t}`, "error");
        return;
      }
      const data = await res.json();
      const result = data?.result ?? data;

      if (action === "get_week_tasks") {
        pushAssistantBlock("Plan na ten tydzień (pogrupowany wg dni):", { week: true, tasks: result });
      } else if (action === "get_tomorrow_tasks") {
        pushAssistantBlock("Oto Twoje zadania na jutro:", result);
      } else if (action === "get_overdue_tasks") {
        pushAssistantBlock("Oto Twoje przeterminowane zadania:", result);
      } else {
        pushAssistantBlock("Oto Twoje zadania na dziś:", result);
      }
    } catch (e: any) {
      pushToast(`Błąd pobierania: ${e?.message || "unknown"}`, "error");
    }
  }

  function pushAssistantBlock(text: string, toolResult: any) {
    setMessages((m) => [...m, { role: "assistant", content: text, toolResult }]);
  }

  // CHAT (LLM)
  async function sendMsg(text: string) {
    if (!text.trim() || !userId) {
      pushToast("Brak userId – zaloguj się ponownie.", "error");
      return;
    }
    const myMsg: Msg = { role: "user", content: text.trim() };
    setMessages((m) => [...m, myMsg]);

    const res = await fetch(abs("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistantId: assistant,
        messages: [...messages, myMsg],
        userId,
        contextTasks: lastTasks,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      pushToast(`Chat error: ${t}`, "error");
      return;
    }
    const data = await res.json();
    const toolResult =
      data && typeof data.toolResult === "object" && data.toolResult !== null && "result" in data.toolResult
        ? (data.toolResult.result as any)
        : data.toolResult;

    setMessages((m) => [...m, { role: "assistant", content: stripTool(data.content || ""), toolResult }]);
  }

  const send = async () => {
    if (!input.trim()) return;
    const txt = input;
    setInput("");
    await sendMsg(txt);
  };

  // RENDER: SIGN-IN
  if (!session) {
    const SignIn = require("@/components/SignIn").SignIn;
    return <SignIn />;
  }

  // RENDER: APP
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <header className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">ZenON</div>
          <div className="text-sm text-zinc-600">Asystenci ADHD & anty-prokrastynacja</div>
        </div>

        <div className="flex gap-2 items-center">
          <AssistantSelector value={assistant} onChange={setAssistant} />
          {assistant === "todoist" && (
            <>
              <button
                className="btn bg-accent text-white"
                onClick={connectTodoist}
                disabled={!userId || connectingTodoist}
              >
                {connectingTodoist ? "Łączenie..." : "Połącz Todoist"}
              </button>
              <button className="btn bg-white" onClick={disconnectTodoist}>
                Odłącz
              </button>
            </>
          )}
        </div>
      </header>

      {/* Szybkie akcje */}
      <div className="flex flex-wrap gap-2">
        {assistant === "todoist" && (
          <>
            <button className="btn bg-ink text-white text-sm" onClick={() => quickFetch("get_today_tasks")} disabled={!userId}>
              dzisiaj
            </button>
            <button className="btn bg-ink text-white text-sm" onClick={() => quickFetch("get_tomorrow_tasks")} disabled={!userId}>
              jutro
            </button>
            <button className="btn bg-ink text-white text-sm" onClick={() => quickFetch("get_week_tasks")} disabled={!userId}>
              tydzień
            </button>
            <button className="btn bg-ink text-white text-sm" onClick={() => quickFetch("get_overdue_tasks")} disabled={!userId}>
              przeterminowane
            </button>
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
                    onRemoved={(id) => removeTaskFromMessage(i, id)}
                    notify={pushToast}
                    onAsk={(txt) => sendMsg(txt)}
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
                onRemoved={(id) => removeTaskFromMessage(i, id)}
                notify={pushToast}
              />
            )}

            {/* Lokalnie wg projektu */}
            {m.toolResult?.groupByProject && m.toolResult?.tasks && (
              <GroupedByProject
                tasks={m.toolResult.tasks}
                userId={userId}
                onRemoved={(id) => removeTaskFromMessage(i, id)}
                notify={pushToast}
              />
            )}

            {/* Grupowanie wg dni tygodnia */}
            {m.toolResult?.week && m.toolResult?.tasks && (
              <GroupedByDay
                tasks={m.toolResult.tasks}
                userId={userId}
                onRemoved={(id) => removeTaskFromMessage(i, id)}
                notify={pushToast}
              />
            )}
          </div>
        ))}
      </main>

      <footer className="sticky bottom-0 bg-soft py-2">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder={
              assistant === "hats"
                ? "Opisz dylemat – zacznijmy pytaniami."
                : "Napisz, co chcesz zrobić (np. „Pokaż jutrzejsze zadania”)."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
          />
          <button className="btn bg-ink text-white" onClick={send} disabled={!userId}>
            Wyślij
          </button>
        </div>
      </footer>

      <Toasts items={toasts} onDone={dropToast} />
    </div>
  );
}
