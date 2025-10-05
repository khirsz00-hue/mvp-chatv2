"use client";
import { useMemo, useState } from "react";
import { TasksList } from "./TasksList";

export function GroupedByDay({
  tasks,
  userId,
  onRemoved,
  notify,
  onAsk,
}: {
  tasks: any[];
  userId?: string;
  onRemoved?: (id: string) => void;
  notify?: (text: string, type?: "success" | "error" | "info") => void;
  onAsk?: (text: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of tasks) {
      const d =
        t.due?.date ||
        (t.due?.datetime ? t.due.datetime.slice(0, 10) : t.due_date) ||
        "Bez daty";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }
    return Array.from(map.entries())
      .map(([day, ts]) => ({ day, tasks: ts }))
      .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  }, [tasks]);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.day} className="space-y-2">
          <div className="text-sm font-semibold">🗓 {g.day}</div>
          <TasksList
            tasks={g.tasks}
            userId={userId}
            onRemoved={onRemoved}
            notify={notify}
            onAsk={onAsk}
          />
        </section>
      ))}
    </div>
  );
}
