import { NextRequest, NextResponse } from "next/server";
import { getTodoistClient } from "@/lib/todoist";

export async function POST(req: NextRequest) {
  try {
    const { action, taskId } = await req.json();
    const client = await getTodoistClient(req);

    if (!client) {
      return NextResponse.json({ error: "Not connected to Todoist" }, { status: 401 });
    }

    let result;

    switch (action) {
      case "complete":
        result = await client.closeTask(taskId);
        break;

      case "move_to_tomorrow":
        // pobieramy task -> zmieniamy due date na jutro
        const task = await client.getTask(taskId);
        if (task?.due?.date) {
          const newDate = new Date();
          newDate.setDate(newDate.getDate() + 1);
          result = await client.updateTask(taskId, {
            due_date: newDate.toISOString().split("T")[0],
          });
        } else {
          return NextResponse.json({ error: "Task has no due date" }, { status: 400 });
        }
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error("Todoist action error", e);
    return NextResponse.json(
      { error: e.message || "Todoist action failed" },
      { status: 500 }
    );
  }
}
