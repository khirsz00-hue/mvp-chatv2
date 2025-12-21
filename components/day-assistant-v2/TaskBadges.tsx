/**
 * TaskBadges Component
 * Displays visual indicators for task status: OVERDUE, DZISIAJ, INBOX
 */

import { TestDayTask } from '@/lib/types/dayAssistantV2'

interface TaskBadgesProps {
  task: TestDayTask
  today?: string
}

export function TaskBadges({ task, today }: TaskBadgesProps) {
  const todayDate = today || new Date().toISOString().split('T')[0]
  
  if (!task.due_date) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
        📥 INBOX
      </span>
    )
  }
  
  if (task.due_date < todayDate) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-semibold">
        🔴 PRZETERMINOWANE
      </span>
    )
  }
  
  if (task.due_date === todayDate) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
        📅 DZISIAJ
      </span>
    )
  }
  
  // Future date
  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
      📆 {task.due_date}
    </span>
  )
}
