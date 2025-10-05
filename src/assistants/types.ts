// src/assistants/types.ts

/** Jednoznaczne ID asystenta używane w całej aplikacji. */
export type AssistantId = "todoist" | "six_hats";

/** Minimalny kontrakt konfiguracji asystenta. */
export interface AssistantConfig {
  /** Identyfikator (musi zgadzać się z AssistantId). */
  id: AssistantId;
  /** Nazwa wyświetlana w UI. */
  name: string;
  /** Opis (opcjonalny, np. do tooltipów / list). */
  description?: string;
  /** Ikona/emoji (opcjonalna, jeżeli chcesz gdzieś pokazać). */
  icon?: string;

  /**
   * Flagi specyficzne dla UI (opcjonalne).
   * Np. czy pokazywać przycisk „Połącz Todoist” wyłącznie w Todoist Helper.
   */
  ui?: {
    showTodoistConnect?: boolean;
  };
}

/** (Opcjonalnie) prosty meta typ, jeśli gdzieś masz listy z id+name. */
export interface AssistantMeta {
  id: AssistantId;
  name: string;
}
