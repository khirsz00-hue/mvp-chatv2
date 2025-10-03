// src/components/ChatSidebar.tsx
'use client';

import { useMemo, useState } from "react";
import type { Chat } from "@/lib/chatStore";

function fmt(ts: number){
  try {
    return new Date(ts).toLocaleString("pl-PL", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
  } catch { return ""; }
}

export function ChatSidebar({
  chats,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}:{
  chats: Chat[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tmpTitle, setTmpTitle] = useState<string>("");

  const sorted = useMemo(()=>{
    return [...chats].sort((a,b)=> b.updatedAt - a.updatedAt);
  },[chats]);

  return (
    <aside className="w-full sm:w-64 shrink-0 border border-zinc-200 bg-white rounded-2xl p-2">
      <div className="px-2 py-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-700">Historia czatów</div>
        <button className="btn bg-ink text-white h-8 px-3 text-xs" onClick={onNew}>Nowy czat</button>
      </div>

      <div className="px-1 pb-2 space-y-1 max-h-[60vh] sm:max-h-[calc(100vh-160px)] overflow-auto">
        {sorted.length === 0 && (
          <div className="text-xs text-zinc-500 px-3 py-3">Brak rozmów. Zacznij nową.</div>
        )}
        {sorted.map(c => {
          const isActive = c.id === activeId;
          const isEditing = editingId === c.id;
          return (
            <div
              key={c.id}
              className={[
                "group rounded-xl px-3 py-2 cursor-pointer border",
                isActive ? "bg-zinc-100 border-zinc-300" : "hover:bg-zinc-50 border-transparent"
              ].join(" ")}
              onClick={()=> !isEditing && onSelect(c.id)}
            >
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    className="input h-8 flex-1"
                    value={tmpTitle}
                    onChange={e=> setTmpTitle(e.target.value)}
                    onKeyDown={e=>{
                      if(e.key==="Enter"){
                        onRename?.(c.id, tmpTitle.trim() || "Rozmowa");
                        setEditingId(null);
                      }
                      if(e.key==="Escape"){ setEditingId(null); }
                    }}
                    autoFocus
                  />
                  <button className="btn bg-ink text-white h-8 px-3 text-xs"
                          onClick={()=>{
                            onRename?.(c.id, tmpTitle.trim() || "Rozmowa");
                            setEditingId(null);
                          }}>Zapisz</button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.title || "Rozmowa"}</div>
                    <div className="text-[10px] text-zinc-500">{fmt(c.updatedAt)}</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button
                      title="Zmień nazwę"
                      className="text-[11px] text-zinc-500 hover:text-zinc-700"
                      onClick={(e)=>{ e.stopPropagation(); setEditingId(c.id); setTmpTitle(c.title); }}
                    >✎</button>
                    {onDelete && (
                      <button
                        title="Usuń rozmowę"
                        className="text-[11px] text-zinc-500 hover:text-red-600"
                        onClick={(e)=>{ e.stopPropagation(); onDelete(c.id); }}
                      >🗑</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
