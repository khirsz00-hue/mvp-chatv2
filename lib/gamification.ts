import { supabase } from './supabaseClient'
import confetti from 'canvas-confetti'

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Update user streak after task completion
 * Only counts first completion of the day for streak purposes
 */
export async function updateStreakOnCompletion(userId: string) {
  const today = getTodayISO()

  // Get or create streak record
  const { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak = 1
  let longestStreak = 1

  if (streak) {
    longestStreak = streak.longest_streak

    if (streak.last_completion_date === today) {
      // Already completed today, don't update streak
      return
    } else if (streak.last_completion_date === yesterdayStr) {
      // Continues streak
      newStreak = streak.current_streak + 1
      longestStreak = Math.max(longestStreak, newStreak)
    } else {
      // Streak broken, reset to 1
      newStreak = 1
    }

    await supabase
      .from('user_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_completion_date: today,
        total_completions: streak.total_completions + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
  } else {
    // Create new streak record
    await supabase
      .from('user_streaks')
      .insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_completion_date: today,
        total_completions: 1
      })
  }

  // Return milestone if any
  if (newStreak % 7 === 0) {
    return { milestone: `🔥 ${newStreak} dni streak! Niesamowite!` }
  } else if (newStreak === 3) {
    return { milestone: '🔥 3 dni z rzędu!' }
  } else if (newStreak === 1 && streak && streak.current_streak > 1) {
    return { milestone: '💪 Nowy start! Kontynuuj!' }
  }
}

/**
 * Update daily stats when tasks are added or completed
 */
export async function updateDailyStats(userId: string, increment: boolean = true) {
  const today = getTodayISO()

  const { data: stats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (stats) {
    await supabase
      .from('daily_stats')
      .update({
        tasks_completed: increment ? stats.tasks_completed + 1 : stats.tasks_completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', stats.id)
  } else {
    // Count total tasks for today
    const { count } = await supabase
      .from('day_assistant_v2_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('due_date', today)

    await supabase
      .from('daily_stats')
      .insert({
        user_id: userId,
        date: today,
        tasks_completed: increment ? 1 : 0,
        tasks_total: count || 0
      })
  }
}

/**
 * Recalculate total tasks for today (useful after adding/removing tasks)
 */
export async function recalculateDailyTotal(userId: string) {
  const today = getTodayISO()

  // Count total tasks for today
  const { count } = await supabase
    .from('day_assistant_v2_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('due_date', today)

  const { data: stats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (stats) {
    await supabase
      .from('daily_stats')
      .update({
        tasks_total: count || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', stats.id)
  } else {
    await supabase
      .from('daily_stats')
      .insert({
        user_id: userId,
        date: today,
        tasks_completed: 0,
        tasks_total: count || 0
      })
  }
}

/**
 * Trigger confetti animation
 * Uses purple/pink brand colors
 */
export function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#8B5CF6', '#EC4899', '#F59E0B'],
    disableForReducedMotion: true
  })
}

/**
 * Show milestone toast notification
 */
export function triggerMilestoneToast(
  message: string, 
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void
) {
  showToast(message, 'success')
}
