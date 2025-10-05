// src/assistants/types.ts

/** Jednoznaczne ID asystenta używane w całej aplikacji. */
export type AssistantId = "todoist" | "six_hats";

/** Minimalny kontrakt konfiguracji asystenta. */
export interface AssistantConfig {
  /** Identyfikator (musi zgadzać się z AssistantId). */
  id: AssistantId;
  /** Nazwa wyświetlana w UI. */
  name: string;
  /** Opis (opcjonalny). */
  description?: string;
  /** Ikona/emoji (opcjonalna). */
  icon?: string;

  /**
   * Jeżeli true, /api/chat traktuje rozmowę jako bezstanową:
   * bierze tylko system prompt + ostatnią wiadomość użytkownika.
   */
  stateless?: boolean;

  /**
   * Ścieżka do pliku z system promptem (markdown/tekst).
   * Np. "src/assistants/todoist/prompt.md".
   * Opcjonalne – jeśli brak, serwer użyje fallbacku i zwróci pusty prompt.
   */
  systemPromptPath?: string;

  /**
   * Folder z wiedzą (pliki .md/.txt będą scalone do kontekstu).
   * Np. "src/assistants/todoist/knowledge".
   * Opcjonalne – jeśli brak/nie istnieje, zwracamy pusty string.
   */
  knowledgeDir?: string;

  /**
   * Flagi UI (opcjonalne).
   * Np. czy pokazywać przycisk „Połącz Todoist” tylko w Todoist Helper.
   */
  ui?: {
    showTodoistConnect?: boolean;
  };
}

/** Przydatne w listach, selektorach itp. */
export interface AssistantMeta {
  id: AssistantId;
  name: string;
}
