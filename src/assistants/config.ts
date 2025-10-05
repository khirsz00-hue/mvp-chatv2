// src/assistants/config.ts
import type { AssistantConfig, AssistantId } from "./types";

/**
 * Zbiór asystentów dostępnych w aplikacji.
 * Ścieżki ustaw tak, jak masz pliki w repo. Podałem sensowne domyślne miejsca.
 * Jeśli któregoś pliku/dir nie masz – nic się nie stanie (serwer ma fallback).
 */
export const assistants: Record<AssistantId, AssistantConfig> = {
  todoist: {
    id: "todoist",
    name: "Todoist Helper",
    description:
      "Dodawaj/organizuj zadania, grupuj je, przenoś terminy i rozmawiaj o nich jak w czacie.",
    icon: "✅",
    ui: { showTodoistConnect: true },
    systemPromptPath: "src/assistants/todoist/prompt.md", // jeśli nie masz – zostanie zignorowane
    knowledgeDir: "src/assistants/todoist/knowledge",
  },
  six_hats: {
    id: "six_hats",
    name: "Six Thinking Hats",
    description:
      "Prowadzony proces decyzyjny (ADHD-friendly): jedno pytanie naraz, kapelusze, synteza.",
    icon: "🎩",
    stateless: true, // ma własny guided flow + historię
    systemPromptPath: "src/assistants/hats/prompt.md", // jeśli nie masz pliku, nie szkodzi
    knowledgeDir: "src/assistants/hats/knowledge",
    ui: { showTodoistConnect: false },
  },
};

/** Domyślny asystent po starcie aplikacji. */
export const defaultAssistant: AssistantId = "todoist";

/** (Opcjonalnie) lista do selektora. */
export const assistantList: Array<{ id: AssistantId; name: string }> = Object.values(
  assistants
).map((a) => ({ id: a.id, name: a.name }));
