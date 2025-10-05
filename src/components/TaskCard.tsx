"use client";
import { useRef, useState } from "react";

export function TaskCard({
  t,
  userId,
  onRemoved,
  notify,
  onAsk,
  selectable,
  selected,
  onToggleSelect,
}: {
  t: any;
  userId?: string;
  onRemoved?: (id: string) => void;
  notify?: (text: string, type?: "success" | "error" | "info") => void;
  onAsk?: (text: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string, next: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const id = String(t.id);
  const content = t.content || t.title;
  const projectName = t.project?.name || t.project || "";
  const dueDate =
    t.due?.date ||
    (t.due?.datetime ? t.due.datetime.slice(0, 10) : t.due_date) ||
    undefined;

  async function api(action: string, payload: any) {
    const res = await fetch("/api/todoist/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, payload }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => "API error"));
    return res.json();
  }

  async function completeOne() {
    try {
      setBusy(true);
      await api("complete_task", { id });
      notify?.("Zadanie ukończono ✅", "success");
      onRemoved?.(id);
    } catch (e: any) {
      notify?.(e?.message || "Błąd ukończenia", "error");
    } finally {
      setBusy(false);
    }
  }

  function openDatePicker() {
    // Od razu pokazujemy natywny datepicker
    if (dateRef.current) {
      // @ts-ignore
      if (typeof dateRef.current.showPicker === "function") {
        // nowoczesne przeglądarki
        // @ts-ignore
        dateRef.current.showPicker();
      } else {
        dateRef.current.click();
      }
    }
  }

  async function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value; // "YYYY-MM-DD"
    if (!date) return;
    try {
      setBusy(true);
      await api("postpone_task", { id, date });
      notify?.(`Przełożono na ${date} 📅`, "success");
      onRemoved?.(id);
    } catch (err: any) {
      notify?.(err?.message || "Błąd przełożenia", "error");
    } finally {
      setBusy(false);
      if (dateRef.current) dateRef.current.value = "";
    }
  }

  return (
    <div className="card p-3">
      <div className="flex items-start gap-2">
        {selectable && (
          <input
            type="checkbox"
            className="mt-1"
            checked={!!selected}
            onChange={(e) => onToggleSelect?.(id, e.target.checked)}
          />
        )}
        <div className="flex-1">
          <div className="text-sm font-medium">{content}</div>
          <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-2">
            {projectName && <span>📁 {projectName}</span>}
            {dueDate && <span>🗓 {dueDate}</span>}
            {!dueDate && <span className="opacity-60">—</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="btn bg-white"
          onClick={completeOne}
          disabled={busy || !userId}
          title="Ukończ"
        >
          Ukończ
        </button>

        {/* PRZEŁÓŻ – natychmiast pokaż datepicker */}
        <button
          className="btn bg-white"
          onClick={openDatePicker}
          disabled={busy || !userId}
          title="Przełóż"
        >
          Przełóż
        </button>
        <input
          ref={dateRef}
          type="date"
          className="hidden"
          onChange={onDateChange}
        />

        <button
          className="btn bg-indigo-600 text-white"
          onClick={() => onAsk?.(`Pomóż mi z tym zadaniem: ${content}`)}
          title="Pomóż mi z tym zadaniem"
        >
          Pomóż mi z tym
        </button>
      </div>
    </div>
  );
}
