// src/app/api/hats/step/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { HATS_GLOBAL, HAT_INSTRUCTIONS, DEFAULT_SEQUENCE, type HatMode } from "@/assistants/hats/prompt";

/**
 * Body:
 * {
 *   userId: string,
 *   mode: HatMode,
 *   transcript?: Array<{hat: HatMode, content: string}>,
 *   context?: any // np. odpowiedzi formularza
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, mode, transcript, context } = (await req.json()) as {
      userId?: string;
      mode?: HatMode;
      transcript?: Array<{ hat: HatMode; content: string }>;
      context?: any;
    };

    if (!userId || !mode) {
      return NextResponse.json({ error: "Missing userId or mode" }, { status: 400 });
    }

    // Walidacja sekwencji: dopuszczamy tylko kolejny krok z DEFAULT_SEQUENCE
    const seq = DEFAULT_SEQUENCE;
    const doneHats = (transcript || []).map(t => t.hat);
    const expectedMode = seq[doneHats.length] || "blue_final";
    if (mode !== expectedMode) {
      return NextResponse.json(
        { error: `Wrong step. Expected "${expectedMode}", got "${mode}".`, expectedMode },
        { status: 400 }
      );
    }

    const historyText = (transcript || [])
      .map((t, i) => `# ${t.hat.toUpperCase()} (${i + 1}/${seq.length})\n${t.content}`)
      .join("\n\n");

    const system = `${HATS_GLOBAL}\n\nAktualny kapelusz: ${mode.toUpperCase()}\nTrzymaj się wyłącznie jego ramy.`;

    const user = `
Kontekst użytkownika (opcjonalny):
${context ? JSON.stringify(context, null, 2) : "(brak)"}

Dotychczasowy zapis (skrót):
${historyText || "(to pierwszy krok)"}

Instrukcja kapelusza:
${HAT_INSTRUCTIONS[mode]}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: mode === "red" ? 0.7 : 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = completion.choices[0]?.message?.content || "";
    const doneCount = doneHats.length + 1;
    const nextMode = seq[doneCount] || null;

    return NextResponse.json({
      ok: true,
      content,
      current: mode,
      next: nextMode,
      progress: { index: doneCount, total: seq.length },
    });
  } catch (e: any) {
    console.error("[/api/hats/step] error:", e?.message, e?.stack);
    return NextResponse.json({ error: e?.message || "Hats step failed" }, { status: 500 });
  }
}
