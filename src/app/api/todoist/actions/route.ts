// src/app/api/todoist/actions/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  // READS
  listTodayTasks,
  listTomorrowTasks,
  listWeekTasks,
  listOverdueTasks,
  listProjects,
  // WRITES
  addTask,
  deleteTask,
  closeTask,
  postponeToTomorrow,
  postponeToDate,
  moveOverdueToToday,
} from "@/lib/todoist";

// Preflight (czasem przeglądarka wyśle OPTIONS)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  // --- DIAGNOSTYKA: nagłówki + body (bezpiecznie) ---
  const ct = req.headers.get("content-type") || "none";
  let raw = "";
  let body: any = null;
  try {
    if ((ct || "").includes("application/json")) {
      body = await req.json();
    } else {
      raw = await req.text();
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = { _raw: raw };
      }
    }
  } catch (e: any) {
    console.error("[/api/todoist/actions] body parse error:", e?.message);
    body = null;
  }

  const userId = body?.userId;
  const action = body?.action;
  const payload = body?.payload ?? {};

  console.log("[/api/todoist/actions] ct:", ct);
  console.log("[/api/todoist/actions] body:", JSON.stringify(body)?.slice(0, 500));

  if (!userId || !action) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing params",
        details: { hasUserId: !!userId, hasAction: !!action, contentType: ct, sampleBody: body },
      },
      { status: 400 }
    );
  }

  try {
    let result: any = null;

    switch (action) {
      /* ---------- READS ---------- */
      case "get_today_tasks": {
        result = await listTodayTasks(userId);
        break;
      }
      case "get_tomorrow_tasks": {
        result = await listTomorrowTasks(userId);
        break;
      }
      case "get_week_tasks": {
        result = await listWeekTasks(userId);
        break;
      }
      case "get_overdue_tasks": {
        result = await listOverdueTasks(userId);
        break;
      }
      case "list_projects": {
        result = await listProjects(userId);
        break;
      }

      /* ---------- WRITES ---------- */
      case "add_task": {
        result = await addTask(userId, payload);
        break;
      }
      case "delete_task": {
        result = await deleteTask(userId, String(payload?.task_id));
        break;
      }
      case "complete_task": {
        result = await closeTask(userId, String(payload?.task_id));
        break;
      }
      case "move_to_tomorrow": {
        result = await postponeToTomorrow(userId, String(payload?.task_id));
        break;
      }
      case "move_to_date": {
        result = await postponeToDate(
          userId,
          String(payload?.task_id),
          String(payload?.date)
        );
        break;
      }
      case "move_overdue_to_today": {
        result = await moveOverdueToToday(userId);
        break;
      }

      default: {
        return NextResponse.json(
          { ok: false, error: "Unknown action", action },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/todoist/actions] handler error:", e?.message, e?.stack);
    return NextResponse.json(
      { ok: false, error: e?.message || "Todoist action failed", stack: e?.stack },
      { status: 500 }
    );
  }
}
