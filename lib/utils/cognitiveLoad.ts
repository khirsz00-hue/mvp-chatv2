/**
 * Clamp cognitive load to the valid 1-5 scale used across the assistant.
 * Callers must supply a numeric value; parsing/validation happens upstream.
 * @param value Raw cognitive load value (may be outside range)
 * @returns Number between 1 and 5 inclusive
 */
export const clampCognitiveLoad = (value: number): number => {
  const safeValue = Number.isFinite(value) ? value : 2
  return Math.min(Math.max(safeValue, 1), 5)
}
