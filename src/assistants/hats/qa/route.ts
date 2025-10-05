// src/app/api/hats/qa/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { DEFAULT_SEQUENCE, HATS_GLOBAL, HAT_INSTRUCTIONS, type HatMode } from "@/assistants/hats/prompt";

function safeParseJSON(text: string): any {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { hat, transcript, context } = (await req.json()) as {
      hat?: HatMode;
      transcript?: Array<{ role: "user" | "assistant"; content: string; hat?: HatMode }>;
      context?: string;
    };

    if (!hat) return NextResponse.json({ error: "Missing hat" }, { status: 400 });

    const system = `${HATS_GLOBAL}
Aktualny kapelusz: ${hat.toUpperCase()}.
Zwracaj TYLKO JSON {"question":"...", "advance":false|true}
`;

    const history = (transcript ?? []).map((m) => {
      const prefix = m.role === "assistant" && m.hat ? `[${m.hat}] ` : "";
      return { role: m.role, content: prefix + m.content };
    });

    const user = `
Kontekst:
${context ?? "(brak)"}

Instrukcja dla tego kapelusza:
${HAT_INSTRUCTIONS[hat]}
`.trim();

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: hat === "red" ? 0.7 : 0.4,
      messages: [
        { role: "system", content: system },
        ...(history as any[]),
        { role: "user", content: user },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "";
    const j = safeParseJSON(raw);
    const question = (j?.question && String(j.question).trim()) || "Doprecyzuj proszę kluczową informację.";
    const advance = j?.advance === true;

    const i = DEFAULT_SEQUENCE.indexOf(hat);
    const nextHat = i >= 0 && i < DEFAULT_SEQUENCE.length - 1 ? DEFAULT_SEQUENCE[i
