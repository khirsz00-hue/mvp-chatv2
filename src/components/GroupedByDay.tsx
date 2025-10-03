'use client';
import { TaskCard } from "@/components/TaskCard";

type Task = { id:string; content:string; due?:{ date?:string }; project_id?:string; priority?:number; };

function formatDay(dateStr?: string) {
  if (!dateStr) return "Brak daty";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pl-PL", { weekday: "long", day:"2-digit", month:"2-digit" });
}

export function GroupedByDay({
  tasks, userId, onRemoved, notify
}:{
  tasks: Task[];
  userId?: string;
  onRemoved?: (id:string)=>void;
  notify?: (text:string, type?:'success'|'error'|'info')=>void;
}) {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = formatDay(t.due?.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([day, list])=>(
        <section key={day} className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 px-1">{day}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((t)=>(
              <TaskCard key={t.id} t={t} userId={userId} onRemoved={onRemoved} notify={notify} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
