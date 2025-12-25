/**
 * Burnout Prevention Module
 * Monitor workload over 7 days, detect burnout risk, show blocking warning
 */

import { supabase } from '@/lib/supabaseClient'
import dayjs from 'dayjs'

export interface BurnoutAssessment {
  riskScore: number  // 0-100
  riskLevel: 'low' | 'medium' | 'high'
  warnings: string[]
  recommendations: string[]
  metrics: {
    avgDailyHours: number
    consecutiveLongDays: number
    completionRate: number
    breaksTaken: number
  }
}

interface DayActivity {
  date: string
  worked_hours: number
  breaks_count: number
  completed_tasks: number
  total_tasks: number
}

/**
 * Get user activity for last 7 days
 */
async function getUserActivityLast7Days(userId: string): Promise<DayActivity[]> {
  try {
    const last7Days = Array.from({ length: 7 }, (_, i) => 
      dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    )
    
    // Fetch all tasks for last 7 days in a single query
    const { data: allTasks } = await supabase
      .from('day_assistant_v2_tasks')
      .select('completed, estimate_min, metadata, due_date')
      .eq('user_id', userId)
      .in('due_date', last7Days)
    
    if (!allTasks) return []
    
    // Group tasks by date
    const tasksByDate = new Map<string, typeof allTasks>()
    allTasks.forEach(task => {
      const date = task.due_date
      if (!tasksByDate.has(date)) {
        tasksByDate.set(date, [])
      }
      tasksByDate.get(date)!.push(task)
    })
    
    const activities: DayActivity[] = []
    
    for (const date of last7Days) {
      const tasks = tasksByDate.get(date) || []
      const completedTasks = tasks.filter(t => t.completed)
      const workedMinutes = completedTasks.reduce((sum, t) => {
        const actual = t.metadata?.actual_duration_min || t.estimate_min
        return sum + actual
      }, 0)
      
      // Count breaks from metadata
      const breaksCount = completedTasks.reduce((sum, t) => {
        return sum + (t.metadata?.breaks_taken || 0)
      }, 0)
      
      activities.push({
        date,
        worked_hours: workedMinutes / 60,
        breaks_count: breaksCount,
        completed_tasks: completedTasks.length,
        total_tasks: tasks.length
      })
    }
    
    return activities
  } catch (error) {
    console.error('❌ [BurnoutPrevention] Error fetching activity:', error)
    return []
  }
}

/**
 * Count consecutive long days (>10h)
 */
function countConsecutiveLongDays(activities: DayActivity[]): number {
  let consecutive = 0
  let maxConsecutive = 0
  
  for (const day of activities) {
    if (day.worked_hours > 10) {
      consecutive++
      maxConsecutive = Math.max(maxConsecutive, consecutive)
    } else {
      consecutive = 0
    }
  }
  
  return maxConsecutive
}

/**
 * Calculate average daily hours
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate completion rate
 */
function calculateCompletionRate(activities: DayActivity[]): number {
  const totalCompleted = activities.reduce((sum, d) => sum + d.completed_tasks, 0)
  const totalTasks = activities.reduce((sum, d) => sum + d.total_tasks, 0)
  
  if (totalTasks === 0) return 100
  return Math.round((totalCompleted / totalTasks) * 100)
}

/**
 * Assess burnout risk for a user
 */
export async function assessBurnoutRisk(userId: string): Promise<BurnoutAssessment> {
  // Get last 7 days of activity
  const last7Days = await getUserActivityLast7Days(userId)
  
  const metrics = {
    avgDailyHours: calculateAverage(last7Days.map(d => d.worked_hours)),
    consecutiveLongDays: countConsecutiveLongDays(last7Days),
    completionRate: calculateCompletionRate(last7Days),
    breaksTaken: last7Days.reduce((sum, d) => sum + d.breaks_count, 0)
  }
  
  let riskScore = 0
  const warnings: string[] = []
  
  // Rule 1: Consecutive long days (>10h)
  if (metrics.consecutiveLongDays >= 3) {
    riskScore += 40
    warnings.push(`${metrics.consecutiveLongDays} dni pracy po >10h - ryzyko wypalenia`)
  }
  
  // Rule 2: Low break frequency
  if (metrics.breaksTaken < 7) {  // Less than 1 per day
    riskScore += 20
    warnings.push(`Tylko ${metrics.breaksTaken} przerw w tygodniu - zalecane: 2-3/dzień`)
  }
  
  // Rule 3: Declining completion rate
  if (metrics.completionRate < 50) {
    riskScore += 30
    warnings.push(`Tylko ${metrics.completionRate}% zadań ukończonych - zbyt dużo naraz?`)
  }
  
  // Rule 4: Very high average hours
  if (metrics.avgDailyHours > 10) {
    riskScore += 20
    warnings.push(`Średnio ${metrics.avgDailyHours.toFixed(1)}h pracy/dzień - powyżej normy`)
  }
  
  const riskLevel: 'low' | 'medium' | 'high' = 
    riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low'
  
  const recommendations: string[] = []
  if (riskLevel === 'high') {
    recommendations.push(
      '🌴 Zaplanuj dzień odpoczynku w tym tygodniu',
      '⏸️ Ogranicz zadania na dziś do 50%',
      '🧘 Dodaj 3x 15min przerwy dziennie',
      '❌ Odrzuć/deleguj zadania o niskim priorytecie'
    )
  } else if (riskLevel === 'medium') {
    recommendations.push(
      '⏸️ Rozważ krótszą sesję pracy dzisiaj',
      '🧘 Zaplanuj 2-3 przerwy',
      '📅 Przełóż mniej pilne zadania'
    )
  }
  
  return {
    riskScore,
    riskLevel,
    warnings,
    recommendations,
    metrics
  }
}
