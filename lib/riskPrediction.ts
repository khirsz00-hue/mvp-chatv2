/**
 * Risk Prediction Module
 * Predicts probability of completing task on time, shows risk indicators
 */

import dayjs from 'dayjs'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'

export interface RiskAssessment {
  probability: number  // 0-100
  riskLevel: 'low' | 'medium' | 'high'
  factors: string[]
  recommendations: Recommendation[]
}

export interface Recommendation {
  type: 'URGENT_ACTION' | 'WARNING' | 'INFO'
  title: string
  actions: RecommendationAction[]
}

export interface RecommendationAction {
  label: string
  action: 'MOVE_TO_TOP' | 'EXTEND_DEADLINE' | 'REDUCE_SCOPE' | 'INCREASE_PRIORITY' | 'SPLIT_TASK'
}

/**
 * Predict completion risk for a task
 */
export function predictCompletionRisk(
  task: TestDayTask,
  queue: TestDayTask[],
  dayPlan: DayPlan | null
): RiskAssessment {
  let probability = 100
  const factors: string[] = []
  
  // Factor 1: Time until deadline
  if (task.due_date) {
    const hoursUntilDeadline = dayjs(task.due_date).diff(dayjs(), 'hour')
    const estimatedHours = task.estimate_min / 60
    
    if (hoursUntilDeadline < 0) {
      probability -= 50
      factors.push(`Przeterminowane o ${Math.abs(hoursUntilDeadline)}h`)
    } else if (hoursUntilDeadline < estimatedHours * 1.5) {
      probability -= 40
      factors.push(`Deadline za ${hoursUntilDeadline}h, estymat ${estimatedHours.toFixed(1)}h`)
    }
  }
  
  // Factor 2: Queue position
  const position = queue.findIndex(t => t.id === task.id) + 1
  if (position > 5) {
    probability -= 20
    factors.push(`Pozycja #${position} w kolejce`)
  } else if (position === 0) {
    // Task not in queue (in "later")
    probability -= 30
    factors.push('Poza kolejką dzisiejszą')
  }
  
  // Factor 3: Cognitive load vs current energy
  if (dayPlan && task.cognitive_load >= 4 && dayPlan.energy <= 2) {
    probability -= 15
    factors.push('Trudne zadanie + niska energia')
  }
  
  // Factor 4: Overdue tasks blocking
  const overdueTasks = queue.filter(t => {
    if (!t.due_date) return false
    return dayjs(t.due_date).isBefore(dayjs(), 'day')
  })
  if (overdueTasks.length > 3) {
    probability -= 10
    factors.push(`${overdueTasks.length} przeterminowanych zadań`)
  }
  
  // Factor 5: Large estimate
  if (task.estimate_min > 120) {
    probability -= 10
    factors.push(`Duże zadanie (${task.estimate_min}min)`)
  }
  
  probability = Math.max(0, Math.min(100, probability))
  
  const riskLevel: 'low' | 'medium' | 'high' = 
    probability > 70 ? 'low' : probability > 40 ? 'medium' : 'high'
  
  return {
    probability,
    riskLevel,
    factors,
    recommendations: generateRiskMitigations(task, factors, riskLevel)
  }
}

/**
 * Generate mitigation recommendations based on risk level
 */
function generateRiskMitigations(
  task: TestDayTask,
  factors: string[],
  riskLevel: 'low' | 'medium' | 'high'
): Recommendation[] {
  const recs: Recommendation[] = []
  
  if (riskLevel === 'high') {
    recs.push({
      type: 'URGENT_ACTION',
      title: '🚨 Wysokie ryzyko niespełnienia deadline!',
      actions: [
        { label: '⚡ Przenieś na początek kolejki', action: 'MOVE_TO_TOP' },
        { label: '📅 Przenieś deadline o 1 dzień', action: 'EXTEND_DEADLINE' },
        { label: '✂️ Zmniejsz scope zadania', action: 'REDUCE_SCOPE' }
      ]
    })
  }
  
  if (riskLevel === 'medium') {
    recs.push({
      type: 'WARNING',
      title: '⚡ Deadline może być trudny do dotrzymania',
      actions: [
        { label: '🔝 Zwiększ priorytet', action: 'INCREASE_PRIORITY' },
        { label: '📋 Rozłóż na 2 dni', action: 'SPLIT_TASK' }
      ]
    })
  }
  
  return recs
}

/**
 * Batch assess risk for multiple tasks
 */
export function assessTasksRisk(
  tasks: TestDayTask[],
  queue: TestDayTask[],
  dayPlan: DayPlan | null
): Map<string, RiskAssessment> {
  const riskMap = new Map<string, RiskAssessment>()
  
  tasks.forEach(task => {
    const risk = predictCompletionRisk(task, queue, dayPlan)
    riskMap.set(task.id, risk)
  })
  
  return riskMap
}
