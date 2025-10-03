import { supabaseAdmin } from "@/lib/supabaseClient";

const TODOIST_BASE = "https://api.todoist.com/rest/v2";

async function assertOk(res: Response, ctx: string) {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new Error(`${ctx} :: HTTP ${res.status} :: ${text}`);
}

const AUTH = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

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

// ---------- reads ----------
export async function listTodayTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("today")}`,
    { headers: AUTH(token) }
  );
  await assertOk(res, "List today tasks");
  return res.json();
}

export async function listTomorrowTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("tomorrow")}`,
    { headers: AUTH(token) }
  );
  await assertOk(res, "List tomorrow tasks");
  return res.json();
}

export async function listWeekTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("7 days")}`,
    { headers: AUTH(token) }
  );
  await assertOk(res, "List week tasks");
  return res.json();
}

export async function listOverdueTasks(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(
    `${TODOIST_BASE}/tasks?filter=${encodeURIComponent("overdue")}`,
    { headers: AUTH(token) }
  );
  await assertOk(res, "List overdue tasks");
  return res.json();
}

export async function listProjects(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
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
  if (!token) throw new Error("Brak tokena Todoist");
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
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: AUTH(token),
  });
  await assertOk(res, "Delete task");
  return { ok: true };
}

export async function closeTask(userId: string, taskId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}/close`, {
    method: "POST",
    headers: AUTH(token),
  });
  await assertOk(res, "Close task");
  return { ok: true };
}

export async function postponeToTomorrow(userId: string, taskId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, {
    method: "POST",
    headers: AUTH(token),
    body: JSON.stringify({ due_string: "tomorrow" }),
  });
  await assertOk(res, "Postpone task to tomorrow");
  return { ok: true };
}

export async function postponeToDate(userId: string, taskId: string, dateISO: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, {
    method: "POST",
    headers: AUTH(token),
    body: JSON.stringify({ due_date: dateISO }),
  });
  await assertOk(res, "Postpone task to specific date");
  return { ok: true };
}

export async function moveOverdueToToday(userId: string) {
  const token = await getUserTodoistToken(userId);
  if (!token) throw new Error("Brak tokena Todoist");
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
    }
  }
  return { moved, ids };
}
