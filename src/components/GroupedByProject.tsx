'use client';

import { TaskCard } from "@/components/TaskCard";

type Task = { id:string; content:string; due?:{ date?:string }; project_id?:string; priority?:number; };

export function GroupedByProject({ tasks }:{ tasks: Task[] }){
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = t.project_id || "Bez projektu";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([pid, list]) => (
        <section key={pid} className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 px-1">Projekt: {pid}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((t)=> <TaskCard key={t.id} t={t} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
