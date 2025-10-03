import { NextRequest, NextResponse } from "next/server";
import {
  addTask,
  deleteTask,
  listOverdueTasks,
  listProjects,
  listTodayTasks,
  moveOverdueToToday,
  closeTask,
  postponeToTomorrow,
} from "@/lib/todoist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(">>> /api/todoist/actions body", body);

    const { userId, action, payload } = body;

    if (!userId || !action) {
      console.error(">>> Missing params:", body);
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "get_today_tasks":
        result = await listTodayTasks(userId);
        break;
      case "get_overdue_tasks":
        result = await listOverdueTasks(userId);
        break;
      case "list_projects":
        result = await listProjects(userId);
        break;
      case "add_task":
        result = await addTask(userId, payload);
        break;
      case "delete_task":
        result = await deleteTask(userId, String(payload.task_id));
        break;
      case "complete_task":
        result = await closeTask(userId, String(payload.task_id));
        break;
      case "move_to_tomorrow":
        result = await postponeToTomorrow(userId, String(payload.task_id));
        break;
      case "move_overdue_to_today":
        result = await moveOverdueToToday(userId);
        break;
      default:
        console.error(">>> Unknown action", action);
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    console.log(">>> Success:", { action, result });
    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error(">>> Todoist actions error:", e);
    return NextResponse.json(
      { error: e?.message || "Todoist action failed", stack: e?.stack },
      { status: 500 }
    );
  }
}
