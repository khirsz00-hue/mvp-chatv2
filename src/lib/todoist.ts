import { supabaseAdmin } from "@/lib/supabaseClient";
const TODOIST_BASE = "https://api.todoist.com/rest/v2";

export async function getUserTodoistToken(userId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("user_tokens").select("*").eq("user_id", userId).eq("provider","todoist").maybeSingle();
  if (error) throw error;
  return data?.access_token as string | undefined;
}
export function oauthUrl() {
  const clientId = process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/todoist/callback`;
  const state = "todoist-oauth";
  const scope = "data:read_write";
  return `https://todoist.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}
export async function exchangeCodeForToken(code: string) {
  const res = await fetch("https://todoist.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ client_id: process.env.TODOIST_CLIENT_ID, client_secret: process.env.TODOIST_CLIENT_SECRET, code })
  });
  if (!res.ok) throw new Error("Todoist token exchange failed");
  return res.json() as Promise<{ access_token: string; token_type: string }>;
}
export async function saveTodoistToken(userId: string, token: string) {
  const sb = supabaseAdmin();
  const { error } = await sb.from("user_tokens").upsert({ provider:"todoist", user_id:userId, access_token: token, updated_at: new Date().toISOString() }, { onConflict:"provider,user_id" });
  if (error) throw error;
}
export async function removeTodoistToken(userId: string) {
  const sb = supabaseAdmin();
  const { error } = await sb.from("user_tokens").delete().eq("user_id", userId).eq("provider","todoist");
  if (error) throw error;
}
async function authFetch(userId: string, path: string, init?: RequestInit) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(`${TODOIST_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type":"application/json", ...(init?.headers||{}) }
  });
  if (!res.ok) throw new Error(`Todoist API error: ${res.status}`);
  return res;
}
export async function listTodayTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(`${TODOIST_BASE}/tasks?filter=${encodeURIComponent("today")}`, { headers: { Authorization:`Bearer ${token}` }});
  if (!res.ok) throw new Error("Nie udało się pobrać zadań na dziś.");
  return res.json();
}
export async function listOverdueTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(`${TODOIST_BASE}/tasks?filter=${encodeURIComponent("overdue")}`, { headers: { Authorization:`Bearer ${token}` }});
  if (!res.ok) throw new Error("Nie udało się pobrać zadań.");
  return res.json();
}
export async function listProjects(userId: string) {
  const res = await authFetch(userId, "/projects");
  return res.json();
}
export async function addTask(userId: string, input: { content:string; due_string?:string; project_id?:string; priority?:number; }) {
  const res = await authFetch(userId, "/tasks", { method:"POST", body: JSON.stringify(input) });
  return res.json();
}
export async function deleteTask(userId: string, taskId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, { method:"DELETE", headers: { Authorization:`Bearer ${token}` }});
  if (!res.ok) throw new Error("Nie udało się usunąć zadania.");
  return { ok:true };
}
export async function moveOverdueToToday(userId: string) {
  const tasks = await listOverdueTasks(userId);
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist.");
  let moved=0; const ids:string[]=[];
  for (const t of tasks) {
    const res = await fetch(`${TODOIST_BASE}/tasks/${t.id}`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body: JSON.stringify({ due_string:"today" }) });
    if (res.ok){ moved++; ids.push(t.id); }
  }
  return { moved, ids };
}
