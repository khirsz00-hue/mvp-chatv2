import { NextRequest, NextResponse } from "next/server";
import { assistants } from "@/assistants/config";
import { readKnowledge, readPrompt } from "@/assistants/server";
import type { AssistantId } from "@/assistants/types";
import { openai } from "@/lib/openai";

/** --- helpers do parsowania bloku ```tool ... ``` --- */
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
    } catch {
      // ignorujemy – payload może być pusty
    }
  }
  return { action: actionMatch?.[1], payload };
}

const stripTool = (t: string) => t.replace(/```tool[\s\S]*?```/g, "").trim();

/** "Ładny" tekst gdy model da tylko blok tool-a */
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
    case "complete_task":
      return "Oznaczyłem zadanie jako ukończone.";
    case "move_to_tomorrow":
      return "Przeniosłem zadanie na jutro.";
    case "move_overdue_to_today":
      return "Przeniosłem zaległe zadania na dziś.";
    default:
      return "Gotowe.";
  }
}

/** heurystyki do pracy na snapshocie */
const wantsGrouping = (t: string) =>
  /(pogrupuj|zgrupuj|grup|bloki|kategorie|tematyczn)/i.test(t);
const wantsOrdering = (t: string) =>
  /(kolejność|kolejnosc|priorytet|uporządkuj|uporzadkuj|plan dnia|harmonogram|schedule|order)/i.test(
    t
  );
const wantsBreakdown = (t: string) =>
  /(rozbij|podziel|kroki|steps|subtask)/i.test(t);

export async function POST(req: NextRequest) {
  const { assistantId, messages, userId, contextTasks } = (await req.json()) as {
    assistantId: AssistantId;
    userId: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    contextTasks?: Array<any>;
  };

  if (!assistantId || !userId) {
    return new NextResponse("Missing assistantId or userId", { status: 400 });
  }

  // system prompt + wiedza
  const baseSystem = readPrompt(assistantId);
  const kb = readKnowledge(assistantId);
  const system = kb ? `${baseSystem}\n\n# Dodatkowa baza wiedzy\n${kb}` : baseSystem;

  // rozmowa: stateless -> tylko ostatnia wiadomość + system
  const conf = assistants[assistantId];
  const convo = conf.stateless
    ? [{ role: "system", content: system }, messages[messages.length - 1]]
    : [{ role: "system", content: system }, ...messages];

  const lastUserText =
    messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

  /** ---------------- Operacje "jak ChatGPT" na snapshocie zadań ---------------- */
  if (assistantId === "todoist" && contextTasks && contextTasks.length > 0) {
    // 1) proponowana kolejność
    if (wantsOrdering(lastUserText)) {
      const sys =
        "Jesteś planerem dnia. Otrzymasz listę zadań Todoist (id, tytuł, terminy, priorytety). " +
        'Zwróć JSON: {"order":["<task_id>",...], "notes":"krótka wskazówka"}. Tylko JSON.';
      const user = [
        "Zadania do uporządkowania:",
        ...contextTasks.map(
          (t: any) =>
            `- ${t.id} | P${t.priority ?? 1} | ${t.due?.date ?? "-"} | ${t.content}`
        ),
        "",
        "Kryteria: krótkość, ważność (P1 ważniejsze), terminy (overdue & today), naturalne bloki.",
      ].join("\n");

      const cmp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      });

      const raw = cmp.choices[0]?.message?.content?.trim() || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        parsed = { order: [], notes: "" };
      }

      return NextResponse.json({
        content: "Proponowana kolejność wykonania:",
        toolResult: { plan: parsed, tasks: contextTasks },
      });
    }

    // 2) grupowanie tematyczne
    if (wantsGrouping(lastUserText)) {
      const sys =
        'Zwróć JSON: {"groups":[{"title":"<nazwa>","task_ids":["<id>",...]}]}. Tylko JSON.';
      const user = [
        "Pogrupuj tematycznie zadania (3–8 grup):",
        ...contextTasks.map((t: any) => `- ${t.id}: ${t.content}`),
      ].join("\n");

      const cmp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      });

      const raw = cmp.choices[0]?.message?.content?.trim() || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        parsed = { groups: [] };
      }

      return NextResponse.json({
        content: "Pogrupowałem zadania na bloki:",
        toolResult: { groups: parsed.groups || [], tasks: contextTasks },
      });
    }

    // 3) rozbicie na kroki
    if (wantsBreakdown(lastUserText)) {
      const sys =
        'Rozbij wybrane zadanie na 5–10 kroków. JSON: {"task_id":"...","steps":["krok1",...]}';
      const user =
        "Wybierz najbardziej złożone zadanie i zaproponuj kroki:\n" +
        contextTasks.map((t: any) => `- ${t.id}: ${t.content}`).join("\n");

      const cmp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      });

      const raw = cmp.choices[0]?.message?.content?.trim() || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        parsed = { task_id: "", steps: [] };
      }

      return NextResponse.json({
        content: "Proponuję takie kroki:",
        toolResult: { breakdown: parsed },
      });
    }
  }
  /** --------------------------------------------------------------------------- */

  // Standardowe wywołanie LLM
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: convo as any,
    temperature: 0.5,
  });

  const raw = completion.choices[0]?.message?.content || "";
  const tool = extractToolCall(raw);
  const cleaned = stripTool(raw);

  // Jeśli model wywołał nasze narzędzie (Todoist) – wykonujemy je i zwracamy wynik
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

    // ⬇️ KLUCZOWA ZMIANA: rozpakuj { success, result } -> zwróć samo result
    let toolJson: any = null;
    try {
      toolJson = await res.json();
    } catch {
      toolJson = null;
    }
    const toolResult =
      toolJson && typeof toolJson === "object" && "success" in toolJson
        ? toolJson.result
        : toolJson;

    const human = cleaned || humanizeToolAction(tool.action);
    return NextResponse.json({ content: human, toolResult });
  }

  // Brak tool-calla – zwracamy treść
  return NextResponse.json({ content: cleaned || raw });
}
