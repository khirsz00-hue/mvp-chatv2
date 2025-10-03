'use client';
type Task = { id:string; content:string; due?:{ date?:string }; project_id?:string; priority?:number; };
export function TaskCard({ t }:{ t:Task }){
  return (
    <div className="card w-full">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{t.content}</div>
        {t.priority ? <span className="text-xs px-2 py-1 rounded-full bg-zinc-100">P{t.priority}</span> : null}
      </div>
      <div className="mt-2 text-sm text-zinc-600 flex gap-3">
        {t.due?.date ? <span>🗓 {t.due.date}</span> : <span>—</span>}
        {t.project_id ? <span>📁 {t.project_id}</span> : null}
      </div>
    </div>
  );
}
