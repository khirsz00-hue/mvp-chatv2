// utils/date.ts
// Lokalny util do normalizacji dat - zwraca lokalny YMD (YYYY-MM-DD) lub null

export function pad(n: number) {
  return n < 10 ? '0' + n : '' + n
}

export function ymdFromDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Parse różne formaty due (string | { date }) i ZAWSZE zwróć lokalne YMD (YYYY-MM-DD) lub null.
 * - Jeśli mamy date-only 'YYYY-MM-DD' -> traktujemy jako lokalną datę (new Date(y, m-1, d))
 * - Jeśli mamy ISO z offsetem -> new Date(...) -> konwertuj do lokalnego YMD
 */
export function parseDueToLocalYMD(dueRaw: any): string | null {
  if (!dueRaw) return null
  const dueStr = typeof dueRaw === 'string' ? dueRaw : dueRaw?.date ?? null
  if (!dueStr) return null

  // date-only
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueStr)) {
    const [y, m, d] = dueStr.split('-').map(Number)
    const local = new Date(y, m - 1, d) // local midnight
    return ymdFromDate(local)
  }

  // otherwise try Date
  try {
    const parsed = new Date(dueStr)
    if (!isNaN(parsed.getTime())) return ymdFromDate(parsed)
    return null
  } catch {
    const fallback = new Date(dueStr)
    return isNaN(fallback.getTime()) ? null : ymdFromDate(fallback)
  }
}
