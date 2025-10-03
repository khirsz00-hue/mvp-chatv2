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

export async function POST(req: NextRequest){
  const { userId, action, payload } = await req.json();
  if(!userId || !action) return new NextResponse("Missing params", { status:400 });
  try{
    switch(action){
      case "get_today_tasks": return NextResponse.json(await listTodayTasks(userId));
      case "get_overdue_tasks": return NextResponse.json(await listOverdueTasks(userId));
      case "list_projects": return NextResponse.json(await listProjects(userId));
      case "add_task": return NextResponse.json(await addTask(userId, payload));
      case "delete_task": return NextResponse.json(await deleteTask(userId, payload.task_id));
      case "complete_task": return NextResponse.json(await closeTask(userId, payload.task_id));
      case "move_to_tomorrow": return NextResponse.json(await postponeToTomorrow(userId, payload.task_id));
      case "move_overdue_to_today": return NextResponse.json(await moveOverdueToToday(userId));
      default: return new NextResponse("Unknown action", { status:400 });
    }
  }catch(e:any){ return new NextResponse(e.message||"Error",{ status:500 }); }
}
