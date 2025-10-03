import { supabaseAdmin } from "@/lib/supabaseClient";

const TODOIST_BASE = "https://api.todoist.com/rest/v2";

// ---------- helpers ----------
async function assertOk(res: Response, ctx: string) {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new Error(`${ctx} :: HTTP ${res.status} :: ${text}`);
}

const AUTH = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

// ---------- tokens ----------
export async function getUserTodoistToken(userId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("user_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "todoist")
    .maybeSingle();
  if (error) throw error;
  return data?.access_token as string | undefined;
}

export function resolveBaseUrl(fallbackOrigin?: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (fallbackOrigin) return fallbackOrigin;
  return "http://localhost:3000";
}

export function buildTodoistAuthUrl(opts: { origin?: string; uid: string }) {
  const clientId = process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID!;
  const baseUrl = resolveBaseUrl(opts.origin);
  const redirectUri = `${baseUrl}/api/todoist/callback`;
  const scope = "data:read_write";
  const state = encodeURIComponent(JSON.stringify({ uid: opts.uid }));
  return (
    `https://todoist.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`
  );
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
  await assertOk(res, "Todoist token exchange");
  return (await res.json()) as { access_token: string; token_type: string };
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

// ---------- reads ----------
export async function listTodayTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("today")}`,
    { headers: AUTH(token) }
  );
  await assertOk(res, "List today tasks");
  return res.json();
}

export async function listOverdueTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("overdue")}`,
    { headers: AUTH(token) }
  );
  await assertOk(res, "List overdue tasks");
  return res.json();
}

export async function listProjects(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const res = await fetch(`${TODOIST_BASE}/projects`, { headers: AUTH(token) });
  await assertOk(res, "List projects");
  return res.json();
}

// ---------- writes ----------
export async function addTask(
  userId: string,
  input: { content: string; due_string?: string; project_id?: string; priority?: number }
) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const res = await fetch(`${TODOIST_BASE}/tasks`, {
    method: "POST",
    headers: AUTH(token),
    body: JSON.stringify(input),
  });
  await assertOk(res, "Add task");
  return res.json();
}

export async function deleteTask(userId: string, taskId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: AUTH(token),
  });
  await assertOk(res, "Delete task");
  return { ok: true };
}

export async function closeTask(userId: string, taskId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}/close`, {
    method: "POST",
    headers: AUTH(token),
  });
  await assertOk(res, "Close task");
  return { ok: true };
}

export async function postponeToTomorrow(userId: string, taskId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, {
    method: "POST",
    headers: AUTH(token),
    body: JSON.stringify({ due_string: "tomorrow" }),
  });
  await assertOk(res, "Postpone task to tomorrow");
  return { ok: true };
}

export async function moveOverdueToToday(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak połączenia z Todoist (token nie znaleziony).");
  const tasks = await listOverdueTasks(userId);
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
      ids.push(String(t.id));
    } else {
      const txt = await res.text().catch(() => "");
      console.error("Move single overdue -> today failed", t.id, res.status, txt);
    }
  }
  return { moved, ids };
}
