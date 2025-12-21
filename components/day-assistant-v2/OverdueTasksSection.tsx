/**
 * OverdueTasksSection Component
 * Displays overdue tasks with options to keep today or postpone
 */

'use client'

import { TestDayTask } from '@/lib/types/dayAssistantV2'
import Button from '@/components/ui/Button'
import { TaskBadges } from './TaskBadges'
import { CalendarBlank, CheckCircle } from '@phosphor-icons/react'

interface OverdueTasksSectionProps {
  overdueTasks: TestDayTask[]
  selectedDate: string
  onKeepToday: (task: TestDayTask) => void
  onPostpone: (task: TestDayTask) => void
}

export function OverdueTasksSection({
  overdueTasks,
  selectedDate,
  onKeepToday,
  onPostpone
}: OverdueTasksSectionProps) {
  if (overdueTasks.length === 0) return null

  return (
    <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-red-800">
          🔴 PRZETERMINOWANE ({overdueTasks.length} {overdueTasks.length === 1 ? 'task' : 'tasków'})
        </span>
      </div>
      <p className="text-sm text-red-700">
        ⚠️ Zadecyduj czy robić dziś
      </p>

      <div className="space-y-2">
        {overdueTasks.map(task => {
          const daysOverdue = task.due_date
            ? Math.floor(
                (new Date(selectedDate).getTime() - new Date(task.due_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0

          return (
            <div
              key={task.id}
              className="bg-white rounded-lg p-3 border border-red-200 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TaskBadges task={task} today={selectedDate} />
                    <p className="font-medium">{task.title}</p>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Due: {task.due_date} ({daysOverdue} {daysOverdue === 1 ? 'dzień' : 'dni'} temu!)
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onKeepToday(task)}
                >
                  <CheckCircle size={16} className="mr-1" /> Dziś
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPostpone(task)}
                >
                  <CalendarBlank size={16} className="mr-1" /> Przełóż
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
