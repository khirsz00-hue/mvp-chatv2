import { supabase } from './supabaseClient'
import { JournalEntry, JournalStats, ArchiveHierarchy } from '@/types/journal'
import { format, parseISO, getYear, getMonth, getWeek } from 'date-fns'

/**
 * Fetch journal entry for a specific date
 */
export async function getJournalEntryByDate(
  userId: string,
  date: string
): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw error
  }

  return data as JournalEntry
}

/**
 * Create or update journal entry
 */
export async function upsertJournalEntry(
  userId: string,
  entry: Partial<JournalEntry>
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(
      {
        ...entry,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,date',
      }
    )
    .select()
    .single()

  if (error) throw error

  return data as JournalEntry
}

/**
 * Fetch all journal entries for a user
 */
export async function getAllJournalEntries(
  userId: string
): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) throw error

  return (data as JournalEntry[]) || []
}

/**
 * Delete journal entry
 */
export async function deleteJournalEntry(
  userId: string,
  entryId: string
): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Calculate statistics for a set of entries
 */
export function calculateStats(entries: JournalEntry[]): JournalStats {
  if (entries.length === 0) {
    return {
      avgEnergy: 0,
      avgMotivation: 0,
      avgSleepQuality: 0,
      avgHoursSlept: 0,
      totalEntries: 0,
    }
  }

  const validEntries = entries.filter(
    (e) => e.energy !== null && e.energy !== undefined
  )

  if (validEntries.length === 0) {
    return {
      avgEnergy: 0,
      avgMotivation: 0,
      avgSleepQuality: 0,
      avgHoursSlept: 0,
      totalEntries: entries.length,
    }
  }

  const totalEnergy = validEntries.reduce((sum, e) => sum + (e.energy || 0), 0)
  const totalMotivation = validEntries.reduce(
    (sum, e) => sum + (e.motivation || 0),
    0
  )
  const totalSleepQuality = validEntries.reduce(
    (sum, e) => sum + (e.sleep_quality || 0),
    0
  )
  const totalHoursSlept = validEntries.reduce(
    (sum, e) => sum + (e.hours_slept || 0),
    0
  )

  return {
    avgEnergy: Math.round((totalEnergy / validEntries.length) * 10) / 10,
    avgMotivation: Math.round((totalMotivation / validEntries.length) * 10) / 10,
    avgSleepQuality:
      Math.round((totalSleepQuality / validEntries.length) * 10) / 10,
    avgHoursSlept: Math.round((totalHoursSlept / validEntries.length) * 10) / 10,
    totalEntries: entries.length,
  }
}

/**
 * Build hierarchical archive structure (year -> month -> week -> day)
 */
export function buildArchiveHierarchy(
  entries: JournalEntry[]
): ArchiveHierarchy[] {
  const hierarchyMap = new Map<number, ArchiveHierarchy>()

  entries.forEach((entry) => {
    if (!entry.date) return

    const date = parseISO(entry.date)
    const year = getYear(date)
    const month = getMonth(date) + 1 // getMonth is 0-indexed
    const week = getWeek(date)

    // Get or create year
    if (!hierarchyMap.has(year)) {
      hierarchyMap.set(year, {
        year,
        months: [],
        stats: { avgEnergy: 0, avgMotivation: 0, avgSleepQuality: 0, avgHoursSlept: 0, totalEntries: 0 },
      })
    }

    const yearData = hierarchyMap.get(year)!

    // Get or create month
    let monthData = yearData.months?.find((m) => m.month === month)
    if (!monthData) {
      monthData = {
        month,
        weeks: [],
        stats: { avgEnergy: 0, avgMotivation: 0, avgSleepQuality: 0, avgHoursSlept: 0, totalEntries: 0 },
      }
      yearData.months?.push(monthData)
    }

    // Get or create week
    let weekData = monthData.weeks?.find((w) => w.week === week)
    if (!weekData) {
      weekData = {
        week,
        days: [],
        stats: { avgEnergy: 0, avgMotivation: 0, avgSleepQuality: 0, avgHoursSlept: 0, totalEntries: 0 },
      }
      monthData.weeks?.push(weekData)
    }

    // Add day
    weekData.days?.push({
      day: entry.date,
      entry,
    })
  })

  // Calculate statistics for each level
  const hierarchyArray = Array.from(hierarchyMap.values())

  hierarchyArray.forEach((yearData) => {
    const yearEntries: JournalEntry[] = []

    yearData.months?.forEach((monthData) => {
      const monthEntries: JournalEntry[] = []

      monthData.weeks?.forEach((weekData) => {
        const weekEntries = weekData.days?.map((d) => d.entry) || []
        weekData.stats = calculateStats(weekEntries)
        monthEntries.push(...weekEntries)
      })

      monthData.stats = calculateStats(monthEntries)
      yearEntries.push(...monthEntries)
    })

    yearData.stats = calculateStats(yearEntries)
  })

  // Sort by year descending
  return hierarchyArray.sort((a, b) => b.year - a.year)
}

/**
 * Get Todoist token for user
 */
export async function getTodoistToken(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('todoist_token')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching Todoist token:', error)
    return null
  }

  return data?.todoist_token || null
}

/**
 * Save Todoist token for user
 */
export async function saveTodoistToken(
  userId: string,
  token: string
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ todoist_token: token })
    .eq('id', userId)

  if (error) throw error
}
