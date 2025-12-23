/**
 * Polish Language Utilities
 * Helper functions for Polish text formatting and pluralization
 */

/**
 * Format Polish plural form for "zadanie" (task)
 * @param count Number of tasks
 * @returns Correctly pluralized form
 */
export function getTasksPlural(count: number): string {
  if (count === 1) return 'zadanie'
  
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  // Numbers ending in 2-4, but not 12-14
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return 'zadania'
  }
  
  return 'zadań'
}

/**
 * Format Polish plural form for "dzień" (day)
 * @param count Number of days
 * @returns Correctly pluralized form
 */
export function getDaysPlural(count: number): string {
  if (count === 1) return 'dzień'
  
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  // Numbers ending in 2-4, but not 12-14
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return 'dni'
  }
  
  return 'dni'
}

/**
 * Format Polish plural form for "tydzień" (week)
 * @param count Number of weeks
 * @returns Correctly pluralized form
 */
export function getWeeksPlural(count: number): string {
  if (count === 1) return 'tydzień'
  
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  // Numbers ending in 2-4, but not 12-14
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return 'tygodnie'
  }
  
  return 'tygodni'
}

/**
 * Format Polish plural form for "miesiąc" (month)
 * @param count Number of months
 * @returns Correctly pluralized form
 */
export function getMonthsPlural(count: number): string {
  if (count === 1) return 'miesiąc'
  
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  
  // Numbers ending in 2-4, but not 12-14
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return 'miesiące'
  }
  
  return 'miesięcy'
}

/**
 * Normalize date to start of day (00:00:00.000)
 * @param dateStr Date string or Date object
 * @returns Normalized Date object
 */
export function normalizeToStartOfDay(dateStr: string | Date): Date {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}
