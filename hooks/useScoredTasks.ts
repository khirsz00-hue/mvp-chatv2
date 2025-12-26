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
    console.log('🎯 [Scoring Debug] ========== START ==========')
    console.log('🎯 [Scoring Debug] Input:', {
      tasksCount: rawTasks.length,
      dayPlan: dayPlan ? {
        energy: dayPlan.energy,
        focus: dayPlan.focus,
        workMode: dayPlan.metadata?.work_mode
      } : null,
      selectedDate
    })
    
    if (!dayPlan) {
      console.log('⚠️ [Scoring Debug] No dayPlan - returning unsorted tasks')
      console.log('🎯 [Scoring Debug] ========== END ==========')
      return rawTasks
    }
    
    console.log('✅ [Scoring Debug] Calculating scores for', rawTasks.length, 'tasks')
    
    // Apply scoring algorithm from recommendation engine
    const scored = scoreAndSortTasks(rawTasks, dayPlan, selectedDate)
    
    // Log first 10 tasks with scores
    console.log('📊 [Scoring Debug] Top scored tasks:')
    scored.slice(0, 10).forEach((task, idx) => {
      const score = task.metadata?._score
      const reasoning = task.metadata?._scoreReasoning || []
      console.log(`  #${idx + 1}. "${task.title}"`)
      console.log(`      Score: ${score ? score.toFixed(2) : 'N/A'}`)
      if (reasoning.length > 0) {
        console.log(`      Reasoning:`, reasoning)
      }
    })
    
    // Check for duplicate scores
    const scores = scored
      .map(t => t.metadata?._score)
      .filter(s => s !== undefined) as number[]
    
    const uniqueScores = new Set(scores)
    
    if (uniqueScores.size < scores.length && scores.length > 0) {
      console.warn('⚠️ [Scoring Debug] DUPLICATE SCORES DETECTED!')
      console.warn('  Unique scores:', uniqueScores.size, '/', scores.length)
      console.warn('  Score distribution:', Array.from(uniqueScores).sort((a, b) => b - a).slice(0, 10))
      
      // Find which tasks have the same score
      const scoreMap = new Map<number, TestDayTask[]>()
      scored.forEach(task => {
        const score = task.metadata?._score
        if (score !== undefined) {
          if (!scoreMap.has(score)) {
            scoreMap.set(score, [])
          }
          scoreMap.get(score)!.push(task)
        }
      })
      
      // Log duplicates
      scoreMap.forEach((tasks, score) => {
        if (tasks.length > 1) {
          console.warn(`  Score ${score.toFixed(2)} appears ${tasks.length} times:`, 
            tasks.map(t => t.title).slice(0, 3)
          )
        }
      })
    } else if (scores.length > 0) {
      console.log('✅ [Scoring Debug] All scores are unique!')
    }
    
    console.log('🎯 [Scoring Debug] ========== END ==========')
    
    return scored
  }, [rawTasks, dayPlan, selectedDate])
}
