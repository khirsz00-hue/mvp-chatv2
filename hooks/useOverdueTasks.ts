/**
 * useOverdueTasks Hook
 * Manages overdue tasks filtering and state
 */

import { useMemo } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

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
    const today = new Date(selectedDate)
    today.setHours(0, 0, 0, 0)
    
    return tasks
      .filter(task => {
        if (!task.due_date || task.completed) return false
        
        const dueDate = new Date(task.due_date)
        dueDate.setHours(0, 0, 0, 0)
        
        return dueDate < today
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
 */
export function getDaysOverdueText(dueDate: string, currentDate: string): string {
  const due = new Date(dueDate)
  const today = new Date(currentDate)
  
  // Normalize to start of day
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const diffTime = today.getTime() - due.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'dziś'
  if (diffDays === 1) return 'wczoraj'
  if (diffDays === 2) return '2 dni temu'
  if (diffDays <= 7) return `${diffDays} dni temu`
  
  const weeks = Math.floor(diffDays / 7)
  if (weeks === 1) return 'tydzień temu'
  if (weeks < 4) return `${weeks} tygodnie temu`
  
  const months = Math.floor(diffDays / 30)
  if (months === 1) return 'miesiąc temu'
  return `${months} miesięcy temu`
}

/**
 * Get days overdue as number
 * @param dueDate Due date string (YYYY-MM-DD)
 * @param currentDate Current date string (YYYY-MM-DD)
 * @returns Number of days overdue
 */
export function getDaysOverdue(dueDate: string, currentDate: string): number {
  const due = new Date(dueDate)
  const today = new Date(currentDate)
  
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const diffTime = today.getTime() - due.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
