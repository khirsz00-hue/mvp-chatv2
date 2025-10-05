// src/app/api/hats/synthesize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { HATS_GLOBAL } from "@/assistants/hats/prompt";

export async function POST(req: NextRequest) {
  try {
    const { transcript, context } = (await req.json()) as {
      transcript?: Array<{ role: "user" | "assistant"; content: string; hat?: string }>;
      context?: string;
    };

    const history = (transcript ?? [])
      .map(
        (m) =>
          `${m.role === "assistant" ? "ASYSTENT" : "UŻYTKOWNIK"}: ${
            m.hat ? `[${m.hat}] ` : ""
          }${m.content}`
      )
      .join("\n");

    const system = `${HATS_GLOBAL}
Jesteś teraz w BLUE FINAL: zrób zwięzłą syntezę i plan.`;

    const user = `
Kontekst:
${context ?? "(brak)"}

Rozmowa:
${history}

Zwróć treść w układzie:

# Szybkie wnioski (Quick wins)
- ...

# Średnioterminowe
- ...

# Długofalowe
- ...

# Rekomendacja / Decyzja
...

# Plan wdrożenia (5–8 kroków)
1) ...
2) ...
...

# Pytania otwarte (3)
- ...
- ...
- ...
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "Brak syntezy.";
    return NextResponse.json({ ok: true, content });
  } catch (e: any) {
    console.error("[/api/hats/synthesize] error:", e?.message, e?.stack);
    return NextResponse.json(
      { error: e?.message || "Synthesis failed" },
      { status: 500 }
    );
  }
}
