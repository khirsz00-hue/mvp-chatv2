/**
 * Context Switching Module
 * Detect frequent context switches, suggest grouping similar tasks
 */

import { TestDayTask } from '@/lib/types/dayAssistantV2'

export interface SwitchingAnalysis {
  switchCount: number
  timeLostMinutes: number
  issue: boolean
  optimizedQueue: TestDayTask[]
}

const SWITCH_PENALTY_MIN = 15  // 15min per context switch

/**
 * Analyze context switching in task queue
 */
export function analyzeContextSwitching(queue: TestDayTask[]): SwitchingAnalysis {
  let switches = 0
  
  for (let i = 0; i < queue.length - 1; i++) {
    if (queue[i].context_type !== queue[i + 1].context_type) {
      switches++
    }
  }
  
  const timeLost = switches * SWITCH_PENALTY_MIN
  
  return {
    switchCount: switches,
    timeLostMinutes: timeLost,
    issue: switches > 3,  // More than 3 switches = problem
    optimizedQueue: optimizeByContext(queue)
  }
}

/**
 * Optimize queue by grouping similar contexts
 * Keeps top MUST tasks at the beginning
 */
function optimizeByContext(queue: TestDayTask[]): TestDayTask[] {
  // Keep MUST tasks at top (first 3)
  const mustTasks = queue.filter(t => t.is_must).slice(0, 3)
  const otherTasks = queue.filter(t => !mustTasks.includes(t))
  
  // Group by context_type
  const grouped: Record<string, TestDayTask[]> = {}
  otherTasks.forEach(task => {
    const context = task.context_type || 'unknown'
    if (!grouped[context]) {
      grouped[context] = []
    }
    grouped[context].push(task)
  })
  
  // Flatten: MUST tasks first, then grouped by context
  const optimized = [...mustTasks]
  Object.values(grouped).forEach(group => {
    optimized.push(...group)
  })
  
  return optimized
}

/**
 * Calculate switching penalty between two contexts
 */
export function calculateSwitchPenalty(
  fromContext: string | null,
  toContext: string | null
): number {
  if (!fromContext || !toContext || fromContext === toContext) {
    return 0
  }
  
  // Different context types have different switching costs
  const heavySwitchContexts = ['deep_work', 'creative', 'learning']
  const isHeavySwitch = 
    heavySwitchContexts.includes(fromContext) && 
    heavySwitchContexts.includes(toContext)
  
  return isHeavySwitch ? SWITCH_PENALTY_MIN * 1.5 : SWITCH_PENALTY_MIN
}

/**
 * Generate context switching recommendation
 */
export function generateSwitchingRecommendation(
  switching: SwitchingAnalysis
): {
  id: string
  type: string
  title: string
  reason: string
  actions: any[]
  impact: string
  confidence: number
} | null {
  if (!switching.issue) return null
  
  return {
    id: 'context-switching',
    type: 'CONTEXT_SWITCHING',
    title: `🎭 ${switching.switchCount} przełączeń kontekstu - tracisz ${switching.timeLostMinutes}min`,
    reason: 'Częste przełączanie między typami pracy obniża produktywność',
    actions: [{
      op: 'REORDER_QUEUE',
      newQueue: switching.optimizedQueue
    }],
    impact: `Zaoszczędź ${switching.timeLostMinutes}min`,
    confidence: 0.9
  }
}
