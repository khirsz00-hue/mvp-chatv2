// src/assistants/server.ts
import fs from "node:fs";
import path from "node:path";
import { assistants } from "./config";
import type { AssistantId } from "./types";

export function readPrompt(assistantId: AssistantId): string {
  const conf = assistants[assistantId];
  // Fallback: jeśli w configu nie podano systemPromptPath, szukaj domyślnego pliku
  const targetRel = conf.systemPromptPath ?? `src/assistants/${assistantId}/prompt.md`;
  const resolved = path.resolve(process.cwd(), targetRel);

  if (!fs.existsSync(resolved)) return "";
  try {
    return fs.readFileSync(resolved, "utf8");
  } catch {
    return "";
  }
}

export function readKnowledge(assistantId: AssistantId): string {
  const conf = assistants[assistantId];
  // Fallback: jeśli nie podano knowledgeDir, użyj domyślnego folderu
  const dirRel = conf.knowledgeDir ?? `src/assistants/${assistantId}/knowledge`;
  const dir = path.resolve(process.cwd(), dirRel);

  if (!fs.existsSync(dir)) return "";

  let out = "";
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (ext !== ".md" && ext !== ".txt") continue;

      const filePath = path.join(dir, e.name);
      try {
        const content = fs.readFileSync(filePath, "utf8");
        out += `\n\n# ${e.name}\n\n${content}\n`;
      } catch {
        // ignorujemy pojedyncze błędy odczytu
      }
    }
  } catch {
    return "";
  }
  return out.trim();
}

export function buildSystemPrompt(assistantId: AssistantId): string {
  const prompt = readPrompt(assistantId);
  const knowledge = readKnowledge(assistantId);
  if (prompt && knowledge) {
    return `${prompt}\n\n---\n# Knowledge Base\n${knowledge}`;
  }
  return prompt || knowledge || "";
}
