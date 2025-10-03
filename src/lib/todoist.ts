// src/lib/todoist.ts
import { supabaseAdmin } from "@/lib/supabaseClient";

const TODOIST_BASE = "https://api.todoist.com/rest/v2";

export async function getUserTodoistToken(userId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("user_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "todoist")
    .maybeSingle();
  if (error) throw error;
  return data?.access_token as string | undefined;
}

/**
 * Bazowy URL aplikacji – działa nawet jeśli NEXT_PUBLIC_APP_URL nie jest ustawione.
 * Priorytety:
 * 1) NEXT_PUBLIC_APP_URL
 * 2) VERCEL_URL (z runtime) -> https://<vercel-url>
 * 3) fallback przekazany z route (origin)
 */
function resolveBaseUrl(fallbackOrigin?: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (fallbackOrigin) return fallbackOrigin;
  return "http://localhost:3000";
}

/**
 * Tworzy URL do autoryzacji Todoist.
 * Używamy parametru `state` do przekazania uid (bez dokładania ?uid do redirect_uri).
 */
export function buildTodoistAuthUrl(opts: { origin?: string; uid: string }) {
  const clientId = process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID!;
  const baseUrl = resolveBaseUrl(opts.origin);
  const redirectUri = `${baseUrl}/api/todoist/callback`;
  const scope = "data:read_write";

  // Przekazujemy uid w state (JSON zakodowany URL-owo)
  const state = encodeURIComponent(JSON.stringify({ uid: opts.uid }));

  const url =
    `https://todoist.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return url;
}

export async function exchangeCodeForToken(code: string) {
  const res = await fetch("https://todoist.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.TODOIST_CLIENT_ID,
      client_secret: process.env.TODOIST_CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error("Todoist token exchange failed");
  return res.json() as Promise<{ access_token: string; token_type: string }>;
}

export async function saveTodoistToken(userId: string, token: string) {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("user_tokens")
    .upsert(
      {
        provider: "todoist",
        user_id: userId,
        access_token: token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,user_id" }
    );
  if (error) throw error;
}

export async function removeTodoistToken(userId: string) {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("user_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "todoist");
  if (error) throw error;
}

const AUTH = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export async function listTodayTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("today")}`,
    { headers: AUTH(token) }
  );
  if (!res.ok) throw new Error("Nie udało się pobrać zadań na dziś.");
  return res.json();
}

export async function listOverdueTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("overdue")}`,
    { headers: AUTH(token) }
  );
  if (!res.ok) throw new Error("Nie udało się pobrać zadań.");
  return res.json();
}

export async function listProjects(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(`${TODOIST_BASE}/projects`, { headers: AUTH(token) });
  if (!res.ok) throw new Error("Nie udało się pobrać projektów.");
  return res.json();
}

export async function addTask(
  userId: string,
  input: { content: string; due_string?: string; project_id?: string; priority?: number }
) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(`${TODOIST_BASE}/tasks`, {
    method: "POST",
    headers: AUTH(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Nie udało się dodać zadania.");
  return res.json();
}

export async function deleteTask(userId: string, taskId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: AUTH(token),
  });
  if (!res.ok) throw new Error("Nie udało się usunąć zadania.");
  return { ok: true };
}

export async function moveOverdueToToday(userId: string) {
  const tasks = await listOverdueTasks(userId);
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  let moved = 0;
  const ids: string[] = [];
  for (const t of tasks) {
    const res = await fetch(`${TODOIST_BASE}/tasks/${t.id}`, {
      method: "POST",
      headers: AUTH(token),
      body: JSON.stringify({ due_string: "today" }),
    });
    if (res.ok) {
      moved++;
      ids.push(t.id);
    }
  }
  return { moved, ids };
}
