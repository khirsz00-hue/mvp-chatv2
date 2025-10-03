// src/lib/chatStore.ts
import type { AssistantId } from "@/assistants/types";

export type Msg = { role: "user" | "assistant"; content: string; toolResult?: any };

export type Chat = {
  id: string;
  assistant: AssistantId;
  title: string;
  messages: Msg[];
  createdAt: number; // epoch ms
  updatedAt: number;
};

const key = (userId: string, assistant: AssistantId) => `zenon:chats:${userId}:${assistant}`;

export function loadChats(userId?: string, assistant?: AssistantId): Chat[] {
  if (!userId || !assistant) return [];
  try {
    const raw = localStorage.getItem(key(userId, assistant));
    if (!raw) return [];
    const arr = JSON.parse(raw) as Chat[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveChats(userId: string, assistant: AssistantId, chats: Chat[]) {
  localStorage.setItem(key(userId, assistant), JSON.stringify(chats));
}

export function makeChat(assistant: AssistantId): Chat {
  const id = (globalThis.crypto && "randomUUID" in globalThis.crypto)
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  const now = Date.now();
  return { id, assistant, title: "Nowy czat", messages: [], createdAt: now, updatedAt: now };
}

export function updateTitleFromFirstUserMessage(chat: Chat): Chat {
  const firstUser = chat.messages.find(m => m.role === "user");
  if (!firstUser) return chat;
  const content = firstUser.content.trim();
  const title = content.length > 40 ? content.slice(0, 40) + "…" : (content || "Rozmowa");
  return { ...chat, title };
}
