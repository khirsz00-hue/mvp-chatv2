'use client';

import { TaskCard } from "@/components/TaskCard";

type Task = { id: string; content: string; due?: { date?: string }; project_id?: string; priority?: number; };
type Group = { title: string; task_ids: string[] };

export function GroupedTasks({ groups, tasks, userId }:{ groups: Group[]; tasks: Task[]; userId: string }) {
  const map = new Map<string, Task>();
  for (const t of tasks) map.set(String(t.id), t);

  return (
    <div className="space-y-4">
      {groups.map((g, idx) => (
        <section key={idx} className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 px-1">{g.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.task_ids.map((id) => {
              const t = map.get(String(id));
              return t ? <TaskCard key={String(id)} t={t} userId={userId} /> : null;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
