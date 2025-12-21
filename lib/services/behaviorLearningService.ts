/**
 * Behavior Learning Service
 * Tracks user actions and updates behavior profile for ML-inspired learning
 */

import { supabase } from '@/lib/supabaseClient'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'
import { UserBehaviorProfile, EnergyPattern, CompletionStreak } from './intelligentScoringEngine'

/**
 * Track task completion and update behavior profile
 */
export async function trackTaskCompletion(
  userId: string,
  task: TestDayTask,
  completionTime: number,  // Actual minutes taken
  hourOfCompletion: number,
  energy: number,
  focus: number
): Promise<void> {
  try {
    // Get current profile
    const profile = await getUserBehaviorProfile(userId)
    if (!profile) return

    // Update energy patterns
    const updatedEnergyPatterns = updateEnergyPatterns(
      profile.energy_patterns,
      hourOfCompletion,
      energy,
      focus
    )

    // Update completion streaks
    const updatedCompletionStreaks = updateCompletionStreaks(
      profile.completion_streaks,
      new Date().toISOString().split('T')[0],
      true
    )

    // Update preferred duration based on completed tasks
    const updatedPreferredDuration = adjustPreferredDuration(
      profile.preferred_task_duration,
      completionTime
    )

    // Save updated profile
    await updateUserBehaviorProfile(userId, {
      energy_patterns: updatedEnergyPatterns,
      completion_streaks: updatedCompletionStreaks,
      preferred_task_duration: updatedPreferredDuration
    })
  } catch (error) {
    console.error('[BehaviorLearning] Error tracking task completion:', error)
  }
}

/**
 * Track task postponement and update patterns
 */
export async function trackTaskPostpone(
  userId: string,
  task: TestDayTask,
  fromDate: string,
  toDate: string,
  reason?: string
): Promise<void> {
  try {
    const profile = await getUserBehaviorProfile(userId)
    if (!profile) return

    // Update postpone patterns
    const patternKey = `cognitive_${task.cognitive_load}`
    const currentPatterns = profile.postpone_patterns || {}
    
    if (!currentPatterns[patternKey]) {
      currentPatterns[patternKey] = {
        count: 0,
        avg_postpone_count: 0,
        reasons: []
      }
    }

    currentPatterns[patternKey].count += 1
    currentPatterns[patternKey].avg_postpone_count = 
      (currentPatterns[patternKey].avg_postpone_count + task.postpone_count) / 2
    
    if (reason) {
      currentPatterns[patternKey].reasons = [
        ...(currentPatterns[patternKey].reasons || []).slice(-5),
        reason
      ]
    }

    // Update completion streaks (postpone is negative event)
    const updatedCompletionStreaks = updateCompletionStreaks(
      profile.completion_streaks,
      fromDate,
      false
    )

    await updateUserBehaviorProfile(userId, {
      postpone_patterns: currentPatterns,
      completion_streaks: updatedCompletionStreaks
    })
  } catch (error) {
    console.error('[BehaviorLearning] Error tracking postpone:', error)
  }
}

/**
 * Recalculate energy patterns based on recent activity
 */
export function updateEnergyPatterns(
  currentPatterns: EnergyPattern[],
  hour: number,
  energy: number,
  focus: number
): EnergyPattern[] {
  const patterns = [...currentPatterns]
  const existingIndex = patterns.findIndex(p => p.hour === hour)

  if (existingIndex >= 0) {
    // Update existing pattern with moving average
    const existing = patterns[existingIndex]
    patterns[existingIndex] = {
      hour,
      avg_energy: (existing.avg_energy * existing.completed_tasks + energy) / (existing.completed_tasks + 1),
      avg_focus: (existing.avg_focus * existing.completed_tasks + focus) / (existing.completed_tasks + 1),
      completed_tasks: existing.completed_tasks + 1
    }
  } else {
    // Create new pattern
    patterns.push({
      hour,
      avg_energy: energy,
      avg_focus: focus,
      completed_tasks: 1
    })
  }

  // Sort by hour
  return patterns.sort((a, b) => a.hour - b.hour)
}

/**
 * Update completion streaks
 */
export function updateCompletionStreaks(
  currentStreaks: CompletionStreak[],
  date: string,
  completed: boolean
): CompletionStreak[] {
  const streaks = [...currentStreaks]
  const existingIndex = streaks.findIndex(s => s.date === date)

  if (existingIndex >= 0) {
    // Update existing streak
    if (completed) {
      streaks[existingIndex].completed_count += 1
    } else {
      streaks[existingIndex].postponed_count += 1
    }
  } else {
    // Create new streak
    streaks.push({
      date,
      completed_count: completed ? 1 : 0,
      postponed_count: completed ? 0 : 1,
      avg_completion_time: 0  // Will be calculated later
    })
  }

  // Keep only last 30 days
  return streaks
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
}

/**
 * Adjust preferred task duration based on completion patterns
 */
export function adjustPreferredDuration(
  currentPreferred: number,
  completedTaskDuration: number
): number {
  // Moving average with weight toward recent completions
  const weight = 0.15  // 15% weight to new data
  const newPreferred = currentPreferred * (1 - weight) + completedTaskDuration * weight
  
  // Clamp between reasonable values (10-120 minutes)
  return Math.max(10, Math.min(120, Math.round(newPreferred)))
}

/**
 * Update peak productivity hours based on completion patterns
 */
export async function updatePeakProductivityHours(
  userId: string,
  energyPatterns: EnergyPattern[]
): Promise<void> {
  if (energyPatterns.length < 6) return  // Need enough data

  // Find hours with highest avg_energy + avg_focus
  const scoredHours = energyPatterns
    .map(p => ({
      hour: p.hour,
      score: p.avg_energy + p.avg_focus,
      tasks: p.completed_tasks
    }))
    .filter(h => h.tasks >= 2)  // Only hours with enough data
    .sort((a, b) => b.score - a.score)

  if (scoredHours.length === 0) return

  // Get top 3 hours as peak range
  const topHours = scoredHours.slice(0, 3).map(h => h.hour).sort((a, b) => a - b)
  const peakStart = topHours[0]
  const peakEnd = topHours[topHours.length - 1] + 1  // Exclusive end

  await updateUserBehaviorProfile(userId, {
    peak_productivity_start: peakStart,
    peak_productivity_end: peakEnd
  })
}

/**
 * Update context switch sensitivity based on completion rates
 */
export async function updateContextSwitchSensitivity(
  userId: string,
  recentTasks: TestDayTask[]
): Promise<void> {
  if (recentTasks.length < 10) return  // Need enough data

  // Analyze context switches
  let switchCount = 0
  let nonSwitchCompletions = 0
  let switchCompletions = 0

  for (let i = 1; i < recentTasks.length; i++) {
    const prev = recentTasks[i - 1]
    const curr = recentTasks[i]

    const isSwitch = prev.context_type !== curr.context_type

    if (isSwitch) {
      switchCount++
      if (curr.completed) switchCompletions++
    } else {
      if (curr.completed) nonSwitchCompletions++
    }
  }

  // Calculate sensitivity based on completion rates
  const switchRate = switchCount > 0 ? switchCompletions / switchCount : 1
  const nonSwitchRate = nonSwitchCompletions / (recentTasks.length - switchCount)

  // Higher sensitivity if switches reduce completion rate significantly
  const rateDifference = nonSwitchRate - switchRate
  const sensitivity = Math.max(0, Math.min(1, 0.5 + rateDifference))

  await updateUserBehaviorProfile(userId, {
    context_switch_sensitivity: sensitivity
  })
}

/**
 * Get user behavior profile from database
 */
export async function getUserBehaviorProfile(
  userId: string
): Promise<UserBehaviorProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_behavior_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile exists yet - this is okay
        return null
      }
      throw error
    }

    return data as UserBehaviorProfile
  } catch (error) {
    console.error('[BehaviorLearning] Error fetching profile:', error)
    return null
  }
}

/**
 * Update user behavior profile
 */
export async function updateUserBehaviorProfile(
  userId: string,
  updates: Partial<UserBehaviorProfile>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_behavior_profiles')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  } catch (error) {
    console.error('[BehaviorLearning] Error updating profile:', error)
    throw error
  }
}

/**
 * Initialize behavior profile for new user with defaults
 */
export async function initializeBehaviorProfile(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_behavior_profiles')
      .insert({
        user_id: userId,
        peak_productivity_start: 9,
        peak_productivity_end: 12,
        preferred_task_duration: 30,
        context_switch_sensitivity: 0.5,
        postpone_patterns: {},
        energy_patterns: [],
        completion_streaks: []
      })

    if (error && error.code !== '23505') {  // Ignore duplicate key error
      throw error
    }
  } catch (error) {
    console.error('[BehaviorLearning] Error initializing profile:', error)
  }
}

/**
 * Track energy/focus slider change
 */
export async function trackEnergyFocusChange(
  userId: string,
  energy: number,
  focus: number,
  hour: number
): Promise<void> {
  try {
    const profile = await getUserBehaviorProfile(userId)
    if (!profile) return

    // Update energy patterns
    const updatedPatterns = updateEnergyPatterns(
      profile.energy_patterns,
      hour,
      energy,
      focus
    )

    await updateUserBehaviorProfile(userId, {
      energy_patterns: updatedPatterns
    })

    // Check if we should update peak hours
    if (updatedPatterns.length >= 6) {
      await updatePeakProductivityHours(userId, updatedPatterns)
    }
  } catch (error) {
    console.error('[BehaviorLearning] Error tracking energy/focus change:', error)
  }
}
