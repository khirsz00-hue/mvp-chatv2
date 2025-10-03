'use client';
import { assistants } from "@/assistants/config";
import type { AssistantId } from "@/assistants/types";

export function AssistantSelector({ value, onChange }:{ value:AssistantId; onChange:(v:AssistantId)=>void }){
  return (
    <select className="select" value={value} onChange={(e)=>onChange(e.target.value as AssistantId)}>
      {Object.values(assistants).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}
