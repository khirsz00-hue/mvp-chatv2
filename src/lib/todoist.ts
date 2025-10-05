// src/lib/todoist.ts
import { createSupabaseServer } from "@/utils/supabase/server";

const TODOIST_BASE = "https://api.todoist.com/rest/v2";
const TODOIST_AUTH = "https://todoist.com/oauth/authorize";
const TODOIST_TOKEN = "https://todoist.com/oauth/access_token";

/** URL do autoryzacji Todoist (uid w state) */
export function buildTodoistAuthUrl(uid: string) {
  const clientId = process.env.TODOIST_CLIENT_ID!;
  const redirect = process.env.TODOIST_REDIRECT_URI!;
  const scope = "data:read_write";
  const state = encodeURIComponent(uid);
  const url = `${TODOIST_AUTH}?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(
    redirect
  )}`;
  return url;
}

/** Wymiana code -> access_token */
export async function exchangeTodoistCode(code: string) {
  const client_id = process.env.TODOIST_CLIENT_ID!;
  const client_secret = process.env.TODOIST_CLIENT_SECRET!;
  const redirect_uri = process.env.TODOIST_REDIRECT_URI!;
  const r = await fetch(TODOIST_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id, client_secret, code, redirect_uri }),
  });
  if (!r.ok) throw new Error("Todoist token exchange failed");
  return r.json() as Promise<{ access_token: string }>;
}

/** Zapis/aktualizacja tokenu w supabase (tabela: user_tokens) */
export async function saveTodoistToken(userId: string, access_token: string) {
  const sb = createSupabaseServer();
  const { error } = await sb.from("user_tokens").upsert(
    { user_id: userId, provider: "todoist", access_token },
    { onConflict: "provider,user_id" }
  );
  if (error) throw new Error(error.message);
}

/** Usunięcie tokenu */
export async function removeTodoistToken(userId: string) {
  const sb = createSupabaseServer();
  const { error } = await sb
    .from("user_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "todoist");
  if (error) throw new Error(error.message);
}

async function getToken(userId: string): Promise<string | null> {
  const sb = createSupabaseServer();
  const { data, error } = await sb
    .from("user_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "todoist")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.access_token ?? null;
}

async function tfetch<T = any>(userId: string, path: string, init?: RequestInit): Promise<T> {
  const token = await getToken(userId);
  if (!token) throw new Error("Brak tokenu Todoist dla użytkownika.");
  const r = await fetch(`${TODOIST_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t || `Todoist error: ${r.status}`);
  }
  if (r.status === 204) return {} as T;
  return r.json();
}

/** === High-level helpers === */
export async function listToday(userId: string) {
  return tfetch(userId, `/tasks?filter=${encodeURIComponent("today | overdue")}`);
}
export async function listTomorrow(userId: string) {
  return tfetch(userId, `/tasks?filter=${encodeURIComponent("tomorrow")}`);
}
export async function listWeek(userId: string) {
  return tfetch(userId, `/tasks?filter=${encodeURIComponent("next 7 days")}`);
}
export async function listOverdue(userId: string) {
  return tfetch(userId, `/tasks?filter=${encodeURIComponent("overdue")}`);
}
export async function listProjects(userId: string) {
  return tfetch(userId, `/projects`);
}
export async function addTask(
  userId: string,
  payload: { content: string; due_string?: string; project_id?: string }
) {
  return tfetch(userId, `/tasks`, { method: "POST", body: JSON.stringify(payload) });
}
export async function deleteTask(userId: string, taskId: string) {
  return tfetch(userId, `/tasks/${taskId}`, { method: "DELETE", headers: {} });
}
export async function closeTask(userId: string, taskId: string) {
  return tfetch(userId, `/tasks/${taskId}/close`, { method: "POST", headers: {} });
}
export async function closeTasksBatch(userId: string, ids: string[]) {
  const results = await Promise.allSettled(ids.map((id) => closeTask(userId, id)));
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.length - ok;
  return { ok, fail };
}
export async function postponeTask(userId: string, taskId: string, due_string: string) {
  // due_string może być naturalnym stringiem lub "YYYY-MM-DD"
  return tfetch(userId, `/tasks/${taskId}`, {
    method: "POST",
    body: JSON.stringify({ due_string }),
  });
}
