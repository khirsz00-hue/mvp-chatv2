'use client';
import { useState } from "react";

type Task = {
  id: string | number;
  content: string;
  project_id?: string | number;
  priority?: number;
  due?: { date?: string; string?: string };
};

export function TaskCard({
  t,
  userId,
  onRemoved,
  notify,
  onAsk,
}: {
  t: Task;
  userId?: string;
  onRemoved?: (id: string) => void;
  notify?: (text: string, type?: "success" | "error" | "info") => void;
  /** Funkcja wysyłająca wiadomość do chatu – dostarczana przez stronę główną */
  onAsk?: (text: string) => void;
}) {
  const [busy, setBusy] = useState<null | string>(null);

  const call = async (action: string, payload: any, successMsg: string) => {
    try {
      if (!userId) {
        notify?.("Brak userId – zaloguj się ponownie.", "error");
        return;
      }
      setBusy(action);
      const res = await fetch("/api/todoist/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, payload }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        notify?.(`Błąd: ${text}`, "error");
        setBusy(null);
        return;
      }
      // optymistyczne odświeżenie widoku (usuwamy z listy)
      if (action === "complete_task" || action === "move_to_tomorrow" || action === "delete_task") {
        onRemoved?.(String(t.id));
      }
      notify?.(successMsg, "success");
    } catch (e: any) {
      notify?.(e?.message || "Wystąpił błąd", "error");
    } finally {
      setBusy(null);
    }
  };

  const complete = () =>
    call("complete_task", { task_id: t.id }, "Zadanie ukończono.");

  const moveTomorrow = () =>
    call("move_to_tomorrow", { task_id: t.id }, "Przeniesiono na jutro.");

  const remove = () =>
    call("delete_task", { task_id: t.id }, "Zadanie usunięto.");

  const help = () => {
    // Komunikat do chatu – przekażemy kontekst zadania w JSON,
    // poprosimy o max 3 pytania uzupełniające i rozbicie na kroki.
    const prompt = [
      "Pomóż mi z tym zadaniem.",
      "Najpierw zadaj maksymalnie 3 krótkie pytania, które są niezbędne, aby dobrze zaplanować wykonanie.",
      "Następnie zaproponuj rozbicie na 3–10 konkretnych kroków (mini-zadań), z krótkimi opisami i estymacją czasu.",
      "Jeśli to możliwe, zaproponuj priorytet (wysoki/średni/niski) oraz sugestię kiedy najlepiej to zrobić.",
      "",
      "Oto pełny kontekst zadania w JSON:",
      "```json",
      JSON.stringify(
        {
          id: String(t.id),
          content: t.content,
          project_id: t.project_id ?? null,
          priority: t.priority ?? null,
          due: t.due ?? null,
        },
        null,
        2
      ),
      "```",
    ].join("\n");

    if (onAsk) {
      onAsk(prompt);
    } else {
      notify?.("Brak funkcji onAsk – nie mogę uruchomić rozmowy.", "error");
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-zinc-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-zinc-900">{t.content}</div>
          <div className="mt-1 text-xs text-zinc-500 flex items-center gap-2">
            {t.due?.date && (
              <span className="inline-flex items-center gap-1">
                📅 {t.due.date}
              </span>
            )}
            {t.priority && (
              <span className="inline-flex items-center gap-1">
                🏷️ P{t.priority}
              </span>
            )}
            <span className="inline-flex items-center gap-1">🆔 {t.id}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-1">
        <button
          className="btn h-8 px-3 text-sm bg-ink text-white"
          onClick={complete}
          disabled={busy !== null}
          title="Oznacz jako ukończone"
        >
          {busy === "complete_task" ? "..." : "Ukończ"}
        </button>
        <button
          className="btn h-8 px-3 text-sm bg-white"
          onClick={moveTomorrow}
          disabled={busy !== null}
          title="Przełóż na jutro"
        >
          {busy === "move_to_tomorrow" ? "..." : "Jutro"}
        </button>
        <button
          className="btn h-8 px-3 text-sm bg-white"
          onClick={remove}
          disabled={busy !== null}
          title="Usuń zadanie"
        >
          {busy === "delete_task" ? "..." : "Usuń"}
        </button>

        {/* NOWE: Pomoc do zadania (rozmowa) */}
        <button
          className="btn h-8 px-3 text-sm bg-accent text-white ml-auto"
          onClick={help}
          disabled={busy !== null}
          title="Poproś asystenta o pomoc: pytania + rozbicie na kroki"
        >
          Pomóż mi
        </button>
      </div>
    </div>
  );
}
