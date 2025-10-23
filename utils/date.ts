// utils/date.ts
// Central date helpers used across the app.

export function pad(n: number) {
  return n < 10 ? '0' + n : '' + n
}

export function ymdFromDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Parse various due formats and return local YMD (YYYY-MM-DD) or null.
 * - Handles date-only strings "YYYY-MM-DD" as local date.
 * - Handles ISO strings with timezone by converting to local date.
 * - Handles objects with .date property (Todoist)
 */
export function parseDueToLocalYMD(dueRaw: any): string | null {
  if (!dueRaw) return null
  const dueStr = typeof dueRaw === 'string' ? dueRaw : dueRaw?.date ?? null
  if (!dueStr) return null

  // date-only (treat as local date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueStr)) {
    const [y, m, d] = dueStr.split('-').map(Number)
    const local = new Date(y, m - 1, d) // local midnight
    return ymdFromDate(local)
  }

  // try to parse as Date
  try {
    const parsed = new Date(dueStr)
    if (!isNaN(parsed.getTime())) {
      return ymdFromDate(parsed)
    }
    return null
  } catch {
    return null
  }
}

/**
 * Returns the number of days from today (0 = today, negative = past, positive = future)
 * Target is interpreted as YMD string (YYYY-MM-DD) in local timezone.
 */
export function daysUntil(ymd: string) {
  try {
    const [y, m, d] = ymd.split('-').map(Number)
    const target = new Date(y, m - 1, d)
    const today = new Date()
    const todayYmd = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const diffMs = target.getTime() - todayYmd.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return NaN
  }
}
