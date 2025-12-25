/**
 * Passive Insight Engine
 * Generates educational insights about queue patterns WITHOUT modifying the queue
 * Replaces action-based recommendations with observational insights
 */

import { TestDayTask } from '@/lib/types/dayAssistantV2'
import dayjs from 'dayjs'

export type InsightType = 
  | 'CONTEXT_PATTERN'
  | 'ENERGY_OBSERVATION'
  | 'DEADLINE_WARNING'
  | 'QUICK_WINS'
  | 'LONG_TASK_ALERT'
  | 'OVERLOAD_WARNING'
  | 'FLOW_STATE_OPPORTUNITY'

export interface PassiveInsight {
  id: string
  type: InsightType
  priority: 'high' | 'medium' | 'low'
  icon: string
  title: string
  message: string
  highlightTaskIds?: string[]
  metadata?: Record<string, any>
}

export interface ScoredTask extends TestDayTask {
  _score?: number
  _scoreFactors?: any
  _scoreReasoning?: string[]
}

/**
 * Generate passive insights (NO queue modifications!)
 */
export function generatePassiveInsights(
  queue: ScoredTask[],
  allTasks: TestDayTask[],
  context: {
    energy: number
    capacity: number
    usedTime: number
  }
): PassiveInsight[] {
  
  const insights: PassiveInsight[] = []
  
  // Insight 1: Context Pattern Detection
  const contextPattern = detectContextPattern(queue)
  if (contextPattern) {
    insights.push({
      id: `context-pattern-${Date.now()}`,
      type: 'CONTEXT_PATTERN',
      priority: 'medium',
      icon: '🎭',
      title: 'Seria zadań w tym samym kontekście',
      message: `Kolejka zawiera ${contextPattern.count} zadań "${contextPattern.contextType}" pod rząd. Idealne do flow state - spróbuj je zrobić bez przerwy!`,
      highlightTaskIds: contextPattern.taskIds,
      metadata: {
        context_type: contextPattern.contextType,
        task_count: contextPattern.count,
        estimated_time_saved: contextPattern.timeSaved
      }
    })
  }
  
  // Insight 2: Energy Match Observation
  const energyObs = observeEnergyMatch(queue, context.energy)
  if (energyObs) {
    insights.push({
      id: `energy-obs-${Date.now()}`,
      type: 'ENERGY_OBSERVATION',
      priority: 'low',
      icon: '⚡',
      title: energyObs.title,
      message: energyObs.message,
      highlightTaskIds: energyObs.taskIds
    })
  }
  
  // Insight 3: Deadline Warning
  const deadlineWarning = checkDeadlineWarnings(queue)
  if (deadlineWarning) {
    insights.push({
      id: `deadline-${Date.now()}`,
      type: 'DEADLINE_WARNING',
      priority: 'high',
      icon: '⏰',
      title: deadlineWarning.title,
      message: deadlineWarning.message,
      highlightTaskIds: [deadlineWarning.taskId]
    })
  }
  
  // Insight 4: Quick Wins Opportunity
  const quickWins = detectQuickWins(queue)
  if (quickWins) {
    insights.push({
      id: `quick-wins-${Date.now()}`,
      type: 'QUICK_WINS',
      priority: 'medium',
      icon: '🎯',
      title: `${quickWins.count} szybkich zadań w kolejce`,
      message: `Masz ${quickWins.count} zadań ≤15min. Możesz je szybko zrobić i poczuć momentum!`,
      highlightTaskIds: quickWins.taskIds,
      metadata: {
        total_time: quickWins.totalTime
      }
    })
  }
  
  // Insight 5: Long Task Alert
  const longTask = detectLongTask(queue)
  if (longTask) {
    insights.push({
      id: `long-task-${Date.now()}`,
      type: 'LONG_TASK_ALERT',
      priority: 'low',
      icon: '📏',
      title: 'Długie zadanie w kolejce',
      message: `Zadanie "${longTask.title}" (${longTask.estimate}min) jest na pozycji #${longTask.position}. Zarezerwuj odpowiedni blok czasu.`,
      highlightTaskIds: [longTask.taskId]
    })
  }
  
  // Insight 6: Overload Warning
  if (context.usedTime > context.capacity) {
    const overflow = context.usedTime - context.capacity
    insights.push({
      id: `overload-${Date.now()}`,
      type: 'OVERLOAD_WARNING',
      priority: 'high',
      icon: '🚨',
      title: 'Dzień przeciążony',
      message: `Masz ${Math.round(context.usedTime / 60)}h zadań zaplanowanych na ${Math.round(context.capacity / 60)}h dzień. Przeciążenie: ${Math.round(overflow / 60)}h.`,
      metadata: {
        capacity: context.capacity,
        used: context.usedTime,
        overflow
      }
    })
  }
  
  // Insight 7: Flow State Opportunity
  const flowOpp = detectFlowStateOpportunity(queue)
  if (flowOpp) {
    insights.push({
      id: `flow-state-${Date.now()}`,
      type: 'FLOW_STATE_OPPORTUNITY',
      priority: 'medium',
      icon: '🌊',
      title: 'Okazja do flow state',
      message: flowOpp.message,
      highlightTaskIds: flowOpp.taskIds
    })
  }
  
  return insights
}

/**
 * Detect context pattern - consecutive tasks with same context
 */
function detectContextPattern(queue: ScoredTask[]) {
  if (queue.length < 2) return null
  
  let maxStreak = 0
  let currentStreak = 1
  let streakContext = queue[0].context_type
  let streakTasks: string[] = [queue[0].id]
  let bestStreakTasks: string[] = [queue[0].id]
  let bestStreakContext = queue[0].context_type
  
  for (let i = 1; i < queue.length; i++) {
    if (queue[i].context_type === queue[i - 1].context_type && queue[i].context_type) {
      currentStreak++
      streakTasks.push(queue[i].id)
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
        bestStreakContext = queue[i].context_type
        bestStreakTasks = [...streakTasks]
      }
    } else {
      currentStreak = 1
      streakTasks = [queue[i].id]
    }
  }
  
  if (maxStreak >= 3) {
    return {
      count: maxStreak,
      contextType: bestStreakContext,
      taskIds: bestStreakTasks,
      timeSaved: (maxStreak - 1) * 15  // Estimated context switch time saved
    }
  }
  
  return null
}

/**
 * Observe energy match between queue and user energy
 */
function observeEnergyMatch(queue: ScoredTask[], userEnergy: number) {
  if (queue.length === 0) return null
  
  const topTasks = queue.slice(0, 3)
  const avgCognitiveLoad = topTasks.reduce((sum, t) => sum + (t.cognitive_load || 3), 0) / topTasks.length
  const diff = Math.abs(avgCognitiveLoad - userEnergy)
  
  if (diff <= 1) {
    return {
      title: 'Dobre dopasowanie energii',
      message: `Pierwsze 3 zadania mają średni cognitive load ${avgCognitiveLoad.toFixed(1)}, co dobrze pasuje do Twojej energii (${userEnergy}/5).`,
      taskIds: topTasks.map(t => t.id)
    }
  } else if (avgCognitiveLoad > userEnergy + 2) {
    return {
      title: 'Zadania mogą być zbyt wymagające',
      message: `Pierwsze zadania mają wysoki cognitive load (${avgCognitiveLoad.toFixed(1)}), a Twoja energia to ${userEnergy}/5. Możesz potrzebować więcej przerw.`,
      taskIds: topTasks.map(t => t.id)
    }
  }
  
  return null
}

/**
 * Check for deadline warnings
 */
function checkDeadlineWarnings(queue: ScoredTask[]) {
  for (const task of queue) {
    if (!task.due_date) continue
    
    const hoursUntilDue = dayjs(task.due_date).diff(dayjs(), 'hour')
    const hoursNeeded = task.estimate_min / 60
    
    if (hoursUntilDue < hoursNeeded * 1.5 && hoursUntilDue > 0) {
      return {
        title: `Deadline za ${hoursUntilDue}h`,
        message: `Zadanie "${task.title}" ma deadline o ${dayjs(task.due_date).format('HH:mm')}. Potrzebujesz ${hoursNeeded.toFixed(1)}h - ${hoursUntilDue < hoursNeeded ? 'mało czasu!' : 'wystarczy czasu.'}`,
        taskId: task.id
      }
    }
  }
  
  return null
}

/**
 * Detect quick wins opportunity
 */
function detectQuickWins(queue: ScoredTask[]) {
  const quickTasks = queue.filter(t => t.estimate_min <= 15)
  
  if (quickTasks.length >= 3) {
    const totalTime = quickTasks.reduce((sum, t) => sum + t.estimate_min, 0)
    return {
      count: quickTasks.length,
      taskIds: quickTasks.map(t => t.id),
      totalTime
    }
  }
  
  return null
}

/**
 * Detect long task in queue
 */
function detectLongTask(queue: ScoredTask[]) {
  for (let i = 0; i < queue.length; i++) {
    const task = queue[i]
    if (task.estimate_min >= 120) {
      return {
        taskId: task.id,
        title: task.title,
        estimate: task.estimate_min,
        position: i + 1
      }
    }
  }
  
  return null
}

/**
 * Detect flow state opportunity - multiple tasks in same context
 */
function detectFlowStateOpportunity(queue: ScoredTask[]) {
  const contextGroups = queue.reduce((acc, task) => {
    const ctx = task.context_type || 'unknown'
    if (!acc[ctx]) acc[ctx] = []
    acc[ctx].push(task)
    return acc
  }, {} as Record<string, ScoredTask[]>)
  
  for (const [context, tasks] of Object.entries(contextGroups)) {
    if (tasks.length >= 3 && context !== 'unknown') {
      const totalTime = tasks.reduce((sum, t) => sum + t.estimate_min, 0)
      if (totalTime >= 60 && totalTime <= 180) {
        return {
          message: `Masz ${tasks.length} zadań "${context}" (${Math.round(totalTime / 60)}h total). Idealny blok do flow state!`,
          taskIds: tasks.map(t => t.id)
        }
      }
    }
  }
  
  return null
}
