/**
 * TaskBadges Component
 * Displays visual indicators for task status: OVERDUE, DZISIAJ, INBOX with enhanced formatting
 */

import { useMemo } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import Badge from '@/components/ui/Badge'

// Constants
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

interface TaskBadgesProps {
  task: TestDayTask
  today?: string
}

export function TaskBadges({ task, today }: TaskBadgesProps) {
  const todayDate = today || new Date().toISOString().split('T')[0]
  
  // Memoize formatted date to avoid recalculation on each render
  const formattedDate = useMemo(() => {
    if (!task.due_date) return null
    
    const futureDate = new Date(task.due_date)
    return futureDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
  }, [task.due_date])
  
  // No due date - INBOX
  if (!task.due_date) {
    return (
      <Badge variant="secondary" className="text-xs">
        📥 INBOX (bez daty)
      </Badge>
    )
  }
  
  // Overdue
  if (task.due_date < todayDate) {
    const daysOverdue = Math.floor(
      (new Date(todayDate).getTime() - new Date(task.due_date).getTime()) / MILLISECONDS_PER_DAY
    )
    return (
      <Badge variant="destructive" className="text-xs">
        🔴 Przeterminowane ({daysOverdue} {daysOverdue === 1 ? 'dzień' : 'dni'})
      </Badge>
    )
  }
  
  // Due today
  if (task.due_date === todayDate) {
    return (
      <Badge variant="default" className="text-xs font-semibold bg-green-700 text-white border-green-800">
        📅 Dziś
      </Badge>
    )
  }
  
  // Future date
  const tomorrow = new Date(todayDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  // Tomorrow
  if (task.due_date === tomorrowStr) {
    return (
      <Badge variant="outline" className="text-xs">
        📆 Jutro
      </Badge>
    )
  }
  
  // Format date as DD.MM
  return (
    <Badge variant="outline" className="text-xs text-gray-600">
      📆 {formattedDate}
    </Badge>
  )
}
