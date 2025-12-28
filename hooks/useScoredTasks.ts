/**
 * Hook: useScoredTasks
 * Applies intelligent scoring algorithm to tasks based on energy/focus state
 */

import { useMemo } from 'react'
import { TestDayTask, DayPlan } from '@/lib/types/dayAssistantV2'
import { scoreAndSortTasksV3 } from '@/lib/services/dayAssistantV2RecommendationEngine'

export function useScoredTasks(
  rawTasks: TestDayTask[],
  dayPlan: DayPlan | null,
  selectedDate: string,
  contextFilter: string | null = null
): TestDayTask[] {
  return useMemo(() => {
    console.log('🎯 [Scoring Debug V3] ========== START ==========')
    console.log('🎯 [Scoring Debug V3] Input:', {
      tasksCount: rawTasks.length,
      dayPlan: dayPlan ? {
        energy: dayPlan.energy,
        focus: dayPlan.focus,
        workMode: dayPlan.metadata?.work_mode
      } : null,
      selectedDate,
      contextFilter
    })
    
    // 📊 Verify cognitive_load before scoring
    if (rawTasks.length > 0) {
      console.log('📊 [Scoring Debug V3] Cognitive load BEFORE scoring:')
      rawTasks.slice(0, 5).forEach((task, idx) => {
        console.log(`  #${idx + 1}. "${task.title.substring(0, 40)}"`)
        console.log(`      cognitive_load: ${task.cognitive_load}`)
        console.log(`      estimate_min: ${task.estimate_min}`)
      })
    }
    
    if (!dayPlan) {
      console.log('⚠️ [Scoring Debug V3] No dayPlan - returning unsorted tasks')
      console.log('🎯 [Scoring Debug V3] ========== END ==========')
      return rawTasks
    }
    
    console.log('✅ [Scoring Debug V3] Using Scoring V3 algorithm for', rawTasks.length, 'tasks')
    
    // Apply V3 scoring algorithm from recommendation engine
    const scored = scoreAndSortTasksV3(rawTasks, dayPlan, selectedDate, contextFilter)
    
    // 📊 Verify cognitive_load after scoring
    if (scored.length > 0) {
      console.log('📊 [Scoring Debug V3] Cognitive load AFTER scoring:')
      scored.slice(0, 5).forEach((task, idx) => {
        console.log(`  #${idx + 1}. "${task.title.substring(0, 40)}"`)
        console.log(`      cognitive_load: ${task.cognitive_load}`)
        console.log(`      estimate_min: ${task.estimate_min}`)
      })
    }
    
    // Log first 10 tasks with scores
    console.log('📊 [Scoring Debug V3] Top scored tasks:')
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
      console.warn('⚠️ [Scoring Debug V3] DUPLICATE SCORES DETECTED!')
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
      console.log('✅ [Scoring Debug V3] All scores are unique!')
    }
    
    console.log('🎯 [Scoring Debug V3] ========== END ==========')
    
    return scored
  }, [rawTasks, dayPlan, selectedDate, contextFilter])
}
