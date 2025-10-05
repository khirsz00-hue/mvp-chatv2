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
  /** Ikona/emoji (opcjonalna). */
  icon?: string;

  /**
   * Jeżeli true, /api/chat traktuje rozmowę jako bezstanową:
   * bierze tylko system prompt + ostatnią wiadomość użytkownika.
   * Przydatne dla asystentów, którzy mają własny flow/historię.
   */
  stateless?: boolean;

  /**
   * Flagi UI (opcjonalne).
   * Np. czy pokazywać przycisk „Połącz Todoist” tylko w Todoist Helper.
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
