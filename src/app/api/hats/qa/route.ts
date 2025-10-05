// src/app/api/hats/qa/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import {
  DEFAULT_SEQUENCE,
  HATS_GLOBAL,
  HAT_INSTRUCTIONS,
  type HatMode,
} from "@/assistants/hats/prompt";

// Odporny parser JSON – wycina pierwszy {...} z odpowiedzi
function safeParseJSON(text: string): any {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
  } catch {}
  return null;
}

/**
 * Body:
 * {
 *   hat: HatMode,
 *   transcript: Array<{ role:"user"|"assistant", content:string, hat?: HatMode }>,
 *   context?: string
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   question: string,
 *   advance: boolean,
 *   nextHat: HatMode | null
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { hat, transcript, context } = (await req.json()) as {
      hat?: HatMode;
      transcript?: Array<{
        role: "user" | "assistant";
        content: string;
        hat?: HatMode;
      }>;
      context?: string;
    };

    if (!hat) {
      return NextResponse.json({ error: "Missing hat" }, { status: 400 });
    }

    const system = `${HATS_GLOBAL}
Aktualny kapelusz: ${hat.toUpperCase()}.

Masz zadać JEDNO, krótkie pytanie dotyczące bieżącego problemu użytkownika.
Odnoś się do tego, co użytkownik już powiedział (bez pytań „z kosmosu”).
Dodaj krótko (w nawiasie), dlaczego to pytanie jest ważne – np. "(to pomoże ocenić ryzyko)".
Gdy masz dość danych w tym kapeluszu, ustaw "advance": true.

Zwracaj TYLKO JSON:
{"question":"...", "advance": false}
albo
{"question":"...", "advance": true}
`;

    const history = (transcript ?? []).map((m) => {
      const prefix = m.role === "assistant" && m.hat ? `[${m.hat}] ` : "";
      return { role: m.role, content: prefix + m.content };
    });

    const userMsg = `
Kontekst (jeśli podano):
${context ?? "(brak)"}

Instrukcja dla kapelusza:
${HAT_INSTRUCTIONS[hat]}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: hat === "red" ? 0.7 : 0.4,
      messages: [
        { role: "system", content: system },
        ...(history as any[]),
        { role: "user", content: userMsg },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const j = safeParseJSON(raw);

    const question =
      (j && typeof j.question === "string" && j.question.trim()) ||
      "Doprecyzuj proszę kluczową informację w tym kroku.";
    const advance = !!(j && j.advance === true);

    // wylicz następny kapelusz
    const i = DEFAULT_SEQUENCE.indexOf(hat);
    const nextHat =
      i >= 0 && i < DEFAULT_SEQUENCE.length - 1
        ? DEFAULT_SEQUENCE[i + 1]
        : null;

    return NextResponse.json({ ok: true, question, advance, nextHat });
  } catch (e: any) {
    console.error("[/api/hats/qa] error:", e?.message, e?.stack);
    return NextResponse.json(
      { error: e?.message || "QA failed" },
      { status: 500 }
    );
  }
}
