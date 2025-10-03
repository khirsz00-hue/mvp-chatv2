import { NextRequest, NextResponse } from "next/server";
import { assistants } from "@/assistants/config";
import { readKnowledge, readPrompt } from "@/assistants/server";
import type { AssistantId } from "@/assistants/types";
import { openai } from "@/lib/openai";

function extractToolCall(text: string) {
  const m = text.match(/```tool([\s\S]*?)```/);
  if (!m) return null;
  const block = m[1];
  const actionMatch = block.match(/action:\s*([\w_]+)/);
  const payloadMatch = block.match(/payload:\s*([\s\S]+)/);
  let payload: any = {};
  if (payloadMatch) {
    try {
      payload = JSON.parse(payloadMatch[1].trim());
    } catch {}
  }
  return { action: actionMatch?.[1], payload };
}

function stripToolFence(text: string) {
  return text.replace(/```tool[\s\S]*?```/g, "").trim();
}

function humanizeToolAction(action?: string) {
  switch (action) {
    case "get_today_tasks":
      return "Oto Twoje zadania na dziś:";
    case "get_overdue_tasks":
      return "Oto Twoje przeterminowane zadania:";
    case "list_projects":
      return "Lista projektów:";
    case "add_task":
      return "Dodano zadanie. Poniżej szczegóły:";
    case "delete_task":
      return "Usunięto zadanie.";
    case "move_overdue_to_today":
      return "Przeniosłem zaległe zadania na dziś.";
    default:
      return "";
  }
}

export async function POST(req: NextRequest) {
  const { assistantId, messages, userId } = (await req.json()) as {
    assistantId: AssistantId;
    userId: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  };

  if (!assistantId || !userId) {
    return new NextResponse("Missing assistantId or userId", { status: 400 });
  }

  const conf = assistants[assistantId];
  const baseSystem = readPrompt(assistantId);
  const kb = readKnowledge(assistantId);
  const system = kb
    ? `${baseSystem}\n\n# Dodatkowa baza wiedzy\n${kb}`
    : baseSystem;

  const convo = conf.stateless
    ? [{ role: "system", content: system }, messages[messages.length - 1]]
    : [{ role: "system", content: system }, ...messages];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: convo as any,
    temperature: 0.5,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const tool = extractToolCall(raw);
  const cleaned = stripToolFence(raw);

  // Jeśli jest tool-call i to asystent Todoist → wykonujemy akcję i zwracamy ludzki tekst + rezultat
  if (tool && assistantId === "todoist") {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/todoist/actions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: tool.action,
          payload: tool.payload,
        }),
      }
    );

    let toolResult: any = null;
    try {
      toolResult = await res.json();
    } catch {
      /* ignore */
    }

    const human = cleaned || humanizeToolAction(tool.action) || "Gotowe.";
    return NextResponse.json({ content: human, toolResult });
  }

  // W pozostałych przypadkach zwracamy oczyszczony tekst
  return NextResponse.json({ content: cleaned || raw });
}
