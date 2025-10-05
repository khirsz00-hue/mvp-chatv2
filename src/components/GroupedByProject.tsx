"use client";
import { useMemo } from "react";
import { TasksList } from "./TasksList";

export function GroupedByProject({
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
      const p = t.project?.name || t.project || t.project_id || "Bez projektu";
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(t);
    }
    return Array.from(map.entries()).map(([project, ts]) => ({ project, tasks: ts }));
  }, [tasks]);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.project} className="space-y-2">
          <div className="text-sm font-semibold">📁 {g.project}</div>
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
