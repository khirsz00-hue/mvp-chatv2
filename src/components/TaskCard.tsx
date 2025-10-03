'use client';
import { useState } from "react";

type Task = { id:string; content:string; due?:{ date?:string }; project_id?:string; priority?:number; };

export function TaskCard({ t, userId }: { t: Task; userId?: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function call(action: string, payload: any = {}) {
    if (!userId) {
      alert("Brak userId – odśwież stronę lub zaloguj się ponownie.");
      return;
    }
    try {
      setBusy(action);
      const res = await fetch("/api/todoist/actions", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ action, payload, userId })
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("Action error:", txt);
        alert(`Błąd akcji: ${txt}`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold">{t.content}</div>
        {t.priority ? <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-100">P{t.priority}</span> : null}
      </div>

      <div className="mt-2 text-sm text-zinc-600 flex flex-wrap gap-x-4 gap-y-1">
        {t.due?.date ? <span>🗓 {t.due.date}</span> : <span>—</span>}
        {t.project_id ? <span>📁 {t.project_id}</span> : null}
        <span>🆔 {t.id}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn bg-ink text-white text-xs" disabled={!!busy}
          onClick={()=>call("complete_task", { task_id: t.id })}>{
            busy==="complete_task" ? "..." : "Ukończ"
          }</button>
        <button className="btn bg-white text-xs" disabled={!!busy}
          onClick={()=>call("move_to_tomorrow", { task_id: t.id })}>{
            busy==="move_to_tomorrow" ? "..." : "Jutro"
          }</button>
        <button className="btn bg-white text-xs" disabled={!!busy}
          onClick={()=>call("delete_task", { task_id: t.id })}>{
            busy==="delete_task" ? "..." : "Usuń"
          }</button>
      </div>
    </div>
  );
}
