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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, payload } = body || {};

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

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
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error(">>> /api/todoist/actions error:", e?.message, e?.stack);
    return NextResponse.json(
      { error: e?.message || "Todoist action failed", stack: e?.stack },
      { status: 500 }
    );
  }
}
