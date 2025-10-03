// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { assistants } from "@/assistants/config";
import { readKnowledge, readPrompt } from "@/assistants/server";
import type { AssistantId } from "@/assistants/types";
import { openai } from "@/lib/openai";

const stripTool = (t: string) => t.replace(/```tool[\s\S]*?```/g, "").trim();

const isToday     = (s: string) => /(dzisiaj|dziś|today)/i.test(s);
const isTomorrow  = (s: string) => /(jutro|tomorrow)/i.test(s);
const isWeek      = (s: string) => /(tydzień|tydzien|this week|week|7 dni|7\s*days)/i.test(s);
const isOverdue   = (s: string) => /(przeterminowane|zaległe|zalegle|overdue)/i.test(s);

async function callTodoistAction(req: NextRequest, body: any) {
  const url = new URL("/api/todoist/actions", req.nextUrl.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Todoist action failed: HTTP ${res.status} :: ${text}`);
  }
  const json = await res.json().catch(() => ({}));
  return json?.result ?? json;
}

export async function POST(req: NextRequest) {
  try {
    const { assistantId, messages, userId, contextTasks } = (await req.json()) as {
      assistantId: AssistantId;
      userId: string;
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      contextTasks?: Array<any>;
    };

    if (!assistantId || !userId) {
      return new NextResponse("Missing assistantId or userId", { status: 400 });
    }

    const lastUserText = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    console.log("[/api/chat] last:", lastUserText, "assistant:", assistantId);

    // 🔹 Skróty Todoist (działają niezależnie od wybranego asystenta)
    if (isToday(lastUserText)) {
      console.log("[/api/chat] shortcut -> today");
      const tasks = await callTodoistAction(req, { userId, action: "get_today_tasks", payload: {} });
      return NextResponse.json({ content: "Oto Twoje zadania na dziś:", toolResult: tasks });
    }
    if (isTomorrow(lastUserText)) {
      console.log("[/api/chat] shortcut -> tomorrow");
      const tasks = await callTodoistAction(req, { userId, action: "get_tomorrow_tasks", payload: {} });
      return NextResponse.json({ content: "Oto Twoje zadania na jutro:", toolResult: tasks });
    }
    if (isWeek(lastUserText)) {
      console.log("[/api/chat] shortcut -> week");
      const tasks = await callTodoistAction(req, { userId, action: "get_week_tasks", payload: {} });
      return NextResponse.json({ content: "Plan na ten tydzień (pogrupowany wg dni):", toolResult: { week:true, tasks } });
    }
    if (isOverdue(lastUserText)) {
      console.log("[/api/chat] shortcut -> overdue");
      const tasks = await callTodoistAction(req, { userId, action: "get_overdue_tasks", payload: {} });
      return NextResponse.json({ content: "Oto Twoje przeterminowane zadania:", toolResult: tasks });
    }

    // 🔹 LLM (reszta)
    const baseSystem = readPrompt(assistantId);
    const kb = readKnowledge(assistantId);
    const system = kb ? `${baseSystem}\n\n# Dodatkowa baza wiedzy\n${kb}` : baseSystem;

    const conf = assistants[assistantId];
    const convo = conf?.stateless
      ? [{ role: "system", content: system }, messages[messages.length - 1]]
      : [{ role: "system", content: system }, ...messages];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: (convo ?? []) as any,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = stripTool(raw);

    return NextResponse.json({ content: cleaned || raw });
  } catch (e: any) {
    console.error(">>> /api/chat error:", e?.message, e?.stack);
    return NextResponse.json(
      { error: e?.message || "Chat error", stack: e?.stack },
      { status: 500 }
    );
  }
}
