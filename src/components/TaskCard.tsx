'use client';
import { useMemo, useState } from "react";

type Task = { id:string; content:string; due?:{ date?:string }; project_id?:string; priority?:number; };

export function TaskCard({
  t,
  userId,
  onRemoved,
  notify,
}: {
  t: Task;
  userId?: string;
  onRemoved?: (id: string) => void;
  notify?: (text: string, type?: 'success'|'error'|'info') => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState(false);
  const [date, setDate] = useState<string>("");

  const prettyDue = useMemo(()=>{
    if (!t.due?.date) return "—";
    return t.due.date;
  },[t.due?.date]);

  async function call(action: string, payload: any = {}, successMsg?: string) {
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
        notify?.(`Błąd: ${txt}`, 'error');
        return;
      }
      // OPTIMISTIC: usuń kartę lokalnie
      onRemoved?.(t.id);
      if (successMsg) notify?.(successMsg, 'success');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card w-full transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold">{t.content}</div>
        {t.priority ? <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-100">P{t.priority}</span> : null}
      </div>

      <div className="mt-2 text-sm text-zinc-600 flex flex-wrap gap-x-4 gap-y-1">
        <span>🗓 {prettyDue}</span>
        {t.project_id ? <span>📁 {t.project_id}</span> : null}
        <span>🆔 {t.id}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="btn bg-ink text-white text-xs"
          disabled={!!busy}
          onClick={()=>call("complete_task", { task_id: t.id }, "Zadanie ukończono")}
          title="Oznacz jako ukończone"
        >{busy==="complete_task" ? "..." : "Ukończ"}</button>

        <button
          className="btn bg-white text-xs"
          disabled={!!busy}
          onClick={()=>call("move_to_tomorrow", { task_id: t.id }, "Przełożono na jutro")}
          title="Przenieś na jutro"
        >{busy==="move_to_tomorrow" ? "..." : "Jutro"}</button>

        <button
          className="btn bg-white text-xs"
          disabled={!!busy}
          onClick={()=> setOpenDate(true)}
          title="Przenieś na wybraną datę"
        >Przełóż</button>

        <button
          className="btn bg-white text-xs"
          disabled={!!busy}
          onClick={()=>call("delete_task", { task_id: t.id }, "Zadanie usunięto")}
          title="Usuń zadanie"
        >{busy==="delete_task" ? "..." : "Usuń"}</button>
      </div>

      {/* Modal z datepickerem */}
      {openDate && (
        <div className="fixed inset-0 z-[900] bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm space-y-4">
            <div className="text-base font-semibold">Przełóż na datę</div>
            <input
              type="date"
              className="input w-full"
              value={date}
              onChange={(e)=>setDate(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn bg-white" onClick={()=>setOpenDate(false)}>Anuluj</button>
              <button
                className="btn bg-ink text-white"
                disabled={!date || !!busy}
                onClick={async ()=>{
                  await call("move_to_date", { task_id: t.id, date }, `Przełożono na ${date}`);
                  setOpenDate(false);
                }}
              >Zatwierdź</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
