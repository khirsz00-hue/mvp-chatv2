"use client";
import { TasksList } from "./TasksList";

export function GroupedTasks({
  groups,
  tasks,
  userId,
  onRemoved,
  notify,
  onAsk,
}: {
  groups: Array<{ name: string; task_ids: string[] }>;
  tasks: any[];
  userId?: string;
  onRemoved?: (id: string) => void;
  notify?: (text: string, type?: "success" | "error" | "info") => void;
  onAsk?: (text: string) => void;
}) {
  const byId: Record<string, any> = {};
  for (const t of tasks) byId[String(t.id)] = t;

  return (
    <div className="space-y-6">
      {groups.map((g, idx) => {
        const ts = g.task_ids.map((id) => byId[String(id)]).filter(Boolean);
        return (
          <section key={idx} className="space-y-2">
            <div className="text-sm font-semibold">🔖 {g.name}</div>
            <TasksList
              tasks={ts}
              userId={userId}
              onRemoved={onRemoved}
              notify={notify}
              onAsk={onAsk}
            />
          </section>
        );
      })}
    </div>
  );
}
