'use client';
import { useEffect } from "react";

export type Toast = { id: string; text: string; type?: 'success'|'error'|'info'; };

export function Toasts({ items, onDone }:{ items: Toast[]; onDone: (id:string)=>void }){
  useEffect(()=>{
    const timers = items.map(t => setTimeout(()=> onDone(t.id), 3000));
    return ()=> { timers.forEach(clearTimeout); };
  }, [items, onDone]);

  return (
    <div className="fixed top-4 right-4 z-[1000] space-y-2">
      {items.map(t=>(
        <div key={t.id}
          className={[
            "rounded-2xl shadow-lg px-4 py-3 text-sm text-white backdrop-blur",
            "transition-all duration-300 translate-y-0 opacity-100",
            t.type === 'error' ? "bg-red-500/90" : t.type === 'success' ? "bg-emerald-500/90" : "bg-zinc-800/90"
          ].join(' ')}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
