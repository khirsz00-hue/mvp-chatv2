/**
 * Hook: useScoredTasks
 * Applies intelligent scoring algorithm to tasks based on energy/focus state
 */

import { useMemo } from 'react'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'
import { scoreAndSortTasks } from '@/lib/services/dayAssistantV2RecommendationEngine'

export function useScoredTasks(
  rawTasks: TestDayTask[],
  dayPlan: DayPlan | null,
  selectedDate: string
): TestDayTask[] {
  return useMemo(() => {
    if (!dayPlan) {
      // Fallback: no scoring, just return as-is
      return rawTasks
    }
    
    // Apply scoring algorithm from recommendation engine
    return scoreAndSortTasks(rawTasks, dayPlan, selectedDate)
  }, [rawTasks, dayPlan, selectedDate])
}
