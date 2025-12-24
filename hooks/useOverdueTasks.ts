/**
 * useOverdueTasks Hook
 * Manages overdue tasks filtering and state
 */

import { useMemo } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { 
  normalizeToStartOfDay, 
  getDaysPlural, 
  getWeeksPlural, 
  getMonthsPlural 
} from '@/lib/utils/polishText'

export interface OverdueTasksResult {
  overdueTasks: TestDayTask[]
  hasOverdueTasks: boolean
  overdueCount: number
}

/**
 * Hook to filter and manage overdue tasks
 * @param tasks All tasks
 * @param selectedDate Current selected date (YYYY-MM-DD)
 * @returns Filtered overdue tasks with utilities
 */
export function useOverdueTasks(
  tasks: TestDayTask[],
  selectedDate: string
): OverdueTasksResult {
  const overdueTasks = useMemo(() => {
    const today = normalizeToStartOfDay(selectedDate)
    
    console.log('🔍 [useOverdueTasks] Filtering...', {
      totalTasks: tasks.length,
      today: today.toISOString().split('T')[0],
      tasksWithDueDate: tasks.filter(t => t.due_date).length
    })
    
    const filtered = tasks
      .filter(task => {
        if (!task.due_date || task.completed) return false
        
        const dueDate = normalizeToStartOfDay(task.due_date)
        const isOverdue = dueDate < today
        
        if (isOverdue) {
          console.log('⚠️ [useOverdueTasks] Found overdue:', {
            title: task.title,
            due_date: task.due_date,
            days_overdue: Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          })
        }
        
        return isOverdue
      })
      .sort((a, b) => {
        // Sort by priority (DESC) then by due_date (ASC - oldest first)
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }
        const dateA = new Date(a.due_date || 0).getTime()
        const dateB = new Date(b.due_date || 0).getTime()
        return dateA - dateB
      })
    
    console.log('✅ [useOverdueTasks] Result:', filtered.length, 'overdue tasks')
    
    return filtered
  }, [tasks, selectedDate])

  return {
    overdueTasks,
    hasOverdueTasks: overdueTasks.length > 0,
    overdueCount: overdueTasks.length
  }
}

/**
 * Format days overdue in Polish
 * @param dueDate Due date string (YYYY-MM-DD)
 * @param currentDate Current date string (YYYY-MM-DD)
 * @returns Formatted string like "wczoraj", "2 dni temu", etc.
 * 
 * Note: Month calculation uses 30-day approximation for simplicity.
 * This is acceptable for overdue task display where exact precision
 * is less critical than human-readable formatting.
 */
export function getDaysOverdueText(dueDate: string, currentDate: string): string {
  const due = normalizeToStartOfDay(dueDate)
  const today = normalizeToStartOfDay(currentDate)
  
  const diffTime = today.getTime() - due.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'dziś'
  if (diffDays === 1) return 'wczoraj'
  if (diffDays <= 7) return `${diffDays} ${getDaysPlural(diffDays)} temu`
  
  const weeks = Math.floor(diffDays / 7)
  if (weeks < 4) return `${weeks} ${getWeeksPlural(weeks)} temu`
  
  // Approximate months (30 days) - acceptable for UI display
  const months = Math.floor(diffDays / 30)
  return `${months} ${getMonthsPlural(months)} temu`
}

/**
 * Get days overdue as number
 * @param dueDate Due date string (YYYY-MM-DD)
 * @param currentDate Current date string (YYYY-MM-DD)
 * @returns Number of days overdue
 */
export function getDaysOverdue(dueDate: string, currentDate: string): number {
  const due = normalizeToStartOfDay(dueDate)
  const today = normalizeToStartOfDay(currentDate)
  
  const diffTime = today.getTime() - due.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
