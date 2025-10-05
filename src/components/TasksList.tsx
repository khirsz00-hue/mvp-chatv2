"use client";
import { useMemo, useState } from "react";
import { TaskCard } from "./TaskCard";

export function TasksList({
  tasks,
  userId,
  notify,
  onRemoved,
  onAsk,
}: {
  tasks: any[];
  userId?: string;
  notify?: (text: string, type?: "success" | "error" | "info") => void;
  onRemoved?: (id: string) => void;
  onAsk?: (text: string) => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  function toggleSelect(id: string, next: boolean) {
    setSelected((s) => ({ ...s, [id]: next }));
  }

  async function api(action: string, payload: any) {
    const res = await fetch("/api/todoist/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, payload }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => "API error"));
    return res.json();
  }

  async function completeSelected() {
    if (selectedIds.length === 0) return;
    try {
      await api("complete_tasks_batch", { ids: selectedIds });
      notify?.(`Ukończono ${selectedIds.length} zadań ✅`, "success");
      selectedIds.forEach((id) => onRemoved?.(id));
      setSelected({});
    } catch (e: any) {
      notify?.(e?.message || "Błąd ukończenia zadań", "error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          {tasks?.length ?? 0} zadań
          {selectedIds.length > 0 && (
            <span className="ml-2 text-indigo-600">
              {selectedIds.length} zaznaczone
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn bg-indigo-600 text-white"
            onClick={completeSelected}
            disabled={!userId || selectedIds.length === 0}
          >
            Ukończ zaznaczone
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tasks.map((t: any) => (
          <TaskCard
            key={t.id}
            t={t}
            userId={userId}
            onRemoved={onRemoved}
            notify={notify}
            onAsk={onAsk}
            selectable
            selected={!!selected[String(t.id)]}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  );
}
