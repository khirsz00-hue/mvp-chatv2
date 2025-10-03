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

// ---------- tasks ----------
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
