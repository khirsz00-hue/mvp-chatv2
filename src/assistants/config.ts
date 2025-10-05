// src/assistants/config.ts
import type { AssistantConfig, AssistantId } from "./types";

/** Zbiór asystentów dostępnych w aplikacji. */
export const assistants: Record<AssistantId, AssistantConfig> = {
  todoist: {
    id: "todoist",
    name: "Todoist Helper",
    description:
      "Dodawaj/organizuj zadania, grupuj je, przenoś terminy i rozmawiaj o nich jak w czacie.",
    icon: "✅",
    ui: { showTodoistConnect: true },
  },
  six_hats: {
    id: "six_hats",
    name: "Six Thinking Hats",
    description:
      "Prowadzony proces decyzyjny (ADHD-friendly): jedno pytanie naraz, kapelusze, synteza.",
    icon: "🎩",
    ui: { showTodoistConnect: false },
  },
};

/** Domyślny asystent po starcie aplikacji. */
export const defaultAssistant: AssistantId = "todoist";

/** (Opcjonalnie) lista pomocna np. do selektora. */
export const assistantList: Array<{ id: AssistantId; name: string }> = Object.values(
  assistants
).map((a) => ({ id: a.id, name: a.name }));
