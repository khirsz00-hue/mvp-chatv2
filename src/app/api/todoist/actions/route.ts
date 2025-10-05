import { NextResponse } from "next/server";
import {
  listToday,
  listTomorrow,
  listWeek,
  listOverdue,
  listProjects,
  addTask,
  deleteTask,
  closeTask,
  closeTasksBatch,
  postponeTask,
} from "@/lib/todoist";

export async function POST(req: Request) {
  const { userId, action, payload } = await req.json();
  if (!userId || !action) {
    return NextResponse.json({ error: "missing userId/action" }, { status: 400 });
  }

  try {
    let result: any;

    switch (action) {
      case "get_today_tasks":
        result = await listToday(userId);
        break;
      case "get_tomorrow_tasks":
        result = await listTomorrow(userId);
        break;
      case "get_week_tasks":
        result = await listWeek(userId);
        break;
      case "get_overdue_tasks":
        result = await listOverdue(userId);
        break;
      case "list_projects":
        result = await listProjects(userId);
        break;
      case "add_task":
        result = await addTask(userId, payload);
        break;
      case "delete_task":
        result = await deleteTask(userId, payload.id);
        break;
      case "complete_task":
        result = await closeTask(userId, payload.id);
        break;
      case "complete_tasks_batch": {
        const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : [];
        result = await closeTasksBatch(userId, ids);
        break;
      }
      case "postpone_task": {
        // payload: { id: string, due_string?: string, date?: "YYYY-MM-DD" }
        const due_string: string | undefined =
          payload?.date || payload?.due_string; // jeśli podasz date (YYYY-MM-DD), Todoist też przyjmie jako due_string
        if (!due_string) {
          return NextResponse.json({ error: "missing due date" }, { status: 400 });
        }
        result = await postponeTask(userId, payload.id, due_string);
        break;
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
