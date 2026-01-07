/**
 * Chat Context Service
 * Fetches all relevant user data for the AI Chat Assistant
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface TaskContext {
  id: string
  title: string
  description?: string
  priority: number
  is_must: boolean
  is_important: boolean
  estimate_min: number
  cognitive_load: number
  due_date?: string
  completed: boolean
  postpone_count: number
  context_type?: string
  tags?: string[]
}

export interface JournalContext {
  date: string
  energy?: number
  motivation?: number
  sleep_quality?: number
  hours_slept?: number
  notes?: string[]
}

export interface DecisionContext {
  id: string
  title: string
  description: string
  status: string
  current_hat?: string
  created_at: string
}

export interface UserContext {
  tasks: {
    today: TaskContext[]
    upcoming: TaskContext[]
    overdue: TaskContext[]
    completed_today: TaskContext[]
  }
  journal: {
    recent: JournalContext[]
    stats: {
      avg_energy?: number
      avg_motivation?: number
      avg_sleep_quality?: number
      avg_hours_slept?: number
    }
  }
  decisions: {
    active: DecisionContext[]
  }
  patterns: {
    most_postponed_contexts: string[]
    avg_postpone_count: number
    total_tasks_count: number
    completed_tasks_count: number
  }
}

/**
 * Fetch all context data for the chat assistant
 */
export async function fetchChatContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const today = new Date().toISOString().split('T')[0]
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS)
    .toISOString()
    .split('T')[0]
  const sevenDaysFromNow = new Date(Date.now() + SEVEN_DAYS_MS)
    .toISOString()
    .split('T')[0]

  // Fetch tasks
  const [todayTasks, upcomingTasks, overdueTasks, completedTodayTasks] =
    await Promise.all([
      // Today's tasks
      supabase
        .from('day_assistant_v2_tasks')
        .select(
          'id, title, description, priority, is_must, is_important, estimate_min, cognitive_load, due_date, completed, postpone_count, context_type, tags'
        )
        .eq('user_id', userId)
        .eq('due_date', today)
        .eq('completed', false)
        .order('priority', { ascending: true }),

      // Upcoming tasks (next 7 days)
      supabase
        .from('day_assistant_v2_tasks')
        .select(
          'id, title, description, priority, is_must, is_important, estimate_min, cognitive_load, due_date, completed, postpone_count, context_type, tags'
        )
        .eq('user_id', userId)
        .gt('due_date', today)
        .lte('due_date', sevenDaysFromNow)
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(10),

      // Overdue tasks
      supabase
        .from('day_assistant_v2_tasks')
        .select(
          'id, title, description, priority, is_must, is_important, estimate_min, cognitive_load, due_date, completed, postpone_count, context_type, tags'
        )
        .eq('user_id', userId)
        .lt('due_date', today)
        .eq('completed', false)
        .order('due_date', { ascending: true }),

      // Completed today
      supabase
        .from('day_assistant_v2_tasks')
        .select(
          'id, title, description, priority, is_must, is_important, estimate_min, cognitive_load, due_date, completed, postpone_count, context_type, tags'
        )
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', `${today}T00:00:00`)
        .order('completed_at', { ascending: false })
        .limit(10),
    ])

  // Fetch journal entries (last 7 days)
  const { data: journalEntries } = await supabase
    .from('journal_entries')
    .select('date, energy, motivation, sleep_quality, hours_slept, notes')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false })
    .limit(7)

  // Calculate journal stats
  const journalStats = {
    avg_energy: 0,
    avg_motivation: 0,
    avg_sleep_quality: 0,
    avg_hours_slept: 0,
  }

  if (journalEntries && journalEntries.length > 0) {
    const totals = journalEntries.reduce(
      (acc, entry) => ({
        energy: acc.energy + (entry.energy || 0),
        motivation: acc.motivation + (entry.motivation || 0),
        sleep_quality: acc.sleep_quality + (entry.sleep_quality || 0),
        hours_slept: acc.hours_slept + (entry.hours_slept || 0),
        count: acc.count + 1,
      }),
      { energy: 0, motivation: 0, sleep_quality: 0, hours_slept: 0, count: 0 }
    )

    if (totals.count > 0) {
      journalStats.avg_energy = Math.round((totals.energy / totals.count) * 10) / 10
      journalStats.avg_motivation = Math.round((totals.motivation / totals.count) * 10) / 10
      journalStats.avg_sleep_quality = Math.round((totals.sleep_quality / totals.count) * 10) / 10
      journalStats.avg_hours_slept = Math.round((totals.hours_slept / totals.count) * 10) / 10
    }
  }

  // Fetch active decisions
  const { data: activeDecisions } = await supabase
    .from('decisions')
    .select('id, title, description, status, current_hat, created_at')
    .eq('user_id', userId)
    .in('status', ['draft', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch behavior patterns
  const { data: allTasks } = await supabase
    .from('day_assistant_v2_tasks')
    .select('postpone_count, context_type, completed')
    .eq('user_id', userId)

  const patterns = {
    most_postponed_contexts: [] as string[],
    avg_postpone_count: 0,
    total_tasks_count: 0,
    completed_tasks_count: 0,
  }

  if (allTasks && allTasks.length > 0) {
    patterns.total_tasks_count = allTasks.length
    patterns.completed_tasks_count = allTasks.filter((t) => t.completed).length

    const totalPostpones = allTasks.reduce((sum, t) => sum + (t.postpone_count || 0), 0)
    patterns.avg_postpone_count = Math.round((totalPostpones / allTasks.length) * 10) / 10

    // Count postpones by context
    const contextPostpones: Record<string, number> = {}
    allTasks.forEach((task) => {
      if (task.context_type && task.postpone_count > 0) {
        contextPostpones[task.context_type] =
          (contextPostpones[task.context_type] || 0) + task.postpone_count
      }
    })

    patterns.most_postponed_contexts = Object.entries(contextPostpones)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([context]) => context)
  }

  return {
    tasks: {
      today: (todayTasks.data || []) as TaskContext[],
      upcoming: (upcomingTasks.data || []) as TaskContext[],
      overdue: (overdueTasks.data || []) as TaskContext[],
      completed_today: (completedTodayTasks.data || []) as TaskContext[],
    },
    journal: {
      recent: (journalEntries || []) as JournalContext[],
      stats: journalStats,
    },
    decisions: {
      active: (activeDecisions || []) as DecisionContext[],
    },
    patterns,
  }
}

/**
 * Format context for AI prompt
 */
export function formatContextForAI(context: UserContext): string {
  const sections: string[] = []

  // Tasks section
  const mustTasksToday = context.tasks.today.filter((t) => t.is_must)
  const totalTimeToday = context.tasks.today.reduce((sum, t) => sum + t.estimate_min, 0)

  sections.push(`## ZADANIA NA DZIŚ (${context.tasks.today.length})`)
  sections.push(`- Zadania MUST: ${mustTasksToday.length}`)
  sections.push(`- Całkowity czas: ${totalTimeToday} minut (${Math.round(totalTimeToday / 60 * 10) / 10}h)`)

  if (context.tasks.today.length > 0) {
    sections.push('\nLista zadań:')
    context.tasks.today.slice(0, 10).forEach((task) => {
      const mustTag = task.is_must ? '[MUST]' : ''
      const cogLoad = `CL${task.cognitive_load}`
      sections.push(
        `- ${mustTag} "${task.title}" (${task.estimate_min}min, ${cogLoad}, priorytet: ${task.priority})`
      )
    })
  }

  // Overdue tasks
  if (context.tasks.overdue.length > 0) {
    sections.push(`\n## ZADANIA PRZETERMINOWANE (${context.tasks.overdue.length})`)
    context.tasks.overdue.slice(0, 5).forEach((task) => {
      sections.push(`- "${task.title}" (termin: ${task.due_date})`)
    })
  }

  // Upcoming tasks
  if (context.tasks.upcoming.length > 0) {
    sections.push(`\n## NADCHODZĄCE ZADANIA (${context.tasks.upcoming.length})`)
    context.tasks.upcoming.slice(0, 5).forEach((task) => {
      sections.push(`- "${task.title}" (termin: ${task.due_date})`)
    })
  }

  // Completed today
  if (context.tasks.completed_today.length > 0) {
    sections.push(`\n## UKOŃCZONE DZIŚ (${context.tasks.completed_today.length})`)
  }

  // Journal section
  sections.push(`\n## DZIENNIK (ostatnie 7 dni)`)
  if (context.journal.stats.avg_energy && context.journal.stats.avg_energy > 0) {
    sections.push(
      `- Średnia energia: ${context.journal.stats.avg_energy}/10`
    )
    sections.push(
      `- Średnia motywacja: ${context.journal.stats.avg_motivation}/10`
    )
    sections.push(
      `- Średnia jakość snu: ${context.journal.stats.avg_sleep_quality}/10`
    )
    sections.push(
      `- Średni czas snu: ${context.journal.stats.avg_hours_slept}h`
    )
  } else {
    sections.push('- Brak danych z dziennika')
  }

  // Decisions section
  if (context.decisions.active.length > 0) {
    sections.push(`\n## AKTYWNE DECYZJE (${context.decisions.active.length})`)
    context.decisions.active.forEach((decision) => {
      sections.push(`- "${decision.title}" (status: ${decision.status})`)
    })
  }

  // Patterns section
  sections.push(`\n## WZORCE ZACHOWAŃ`)
  sections.push(`- Ukończone zadania: ${context.patterns.completed_tasks_count}/${context.patterns.total_tasks_count}`)
  sections.push(`- Średnia liczba przełożeń: ${context.patterns.avg_postpone_count}`)
  if (context.patterns.most_postponed_contexts.length > 0) {
    sections.push(
      `- Najczęściej odkładane konteksty: ${context.patterns.most_postponed_contexts.join(', ')}`
    )
  }

  return sections.join('\n')
}
