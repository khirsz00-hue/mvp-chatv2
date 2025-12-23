/**
 * OverdueTasksSection Component
 * Displays overdue tasks with collapse/expand and quick actions
 */

'use client'

import { useState, useEffect } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { getDaysOverdueText } from '@/hooks/useOverdueTasks'
import Button from '@/components/ui/Button'
import { TaskBadges } from './TaskBadges'
import { CalendarBlank, CheckCircle, CaretDown, CaretUp, DotsThree } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface OverdueTasksSectionProps {
  overdueTasks: TestDayTask[]
  selectedDate: string
  onKeepToday: (task: TestDayTask) => void
  onPostpone: (task: TestDayTask) => void
  onOpenContextMenu?: (task: TestDayTask) => void
}

const COLLAPSED_KEY = 'overdue_section_collapsed'

export function OverdueTasksSection({
  overdueTasks,
  selectedDate,
  onKeepToday,
  onPostpone,
  onOpenContextMenu
}: OverdueTasksSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  })

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLLAPSED_KEY, String(isCollapsed))
    }
  }, [isCollapsed])

  if (overdueTasks.length === 0) return null

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev)
  }

  const taskCountText = overdueTasks.length === 1 
    ? 'zadanie' 
    : overdueTasks.length < 5 
      ? 'zadania' 
      : 'zadań'

  return (
    <div 
      className={cn(
        "border-2 border-red-200 bg-red-50 rounded-lg overflow-hidden transition-all",
        isCollapsed ? "animate-pulse" : ""
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between p-4 hover:bg-red-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-red-800">
            ⚠️ PRZETERMINOWANE
          </span>
          {isCollapsed ? (
            <span className="px-2 py-1 bg-red-600 text-white text-sm font-bold rounded-full animate-pulse">
              ! {overdueTasks.length}
            </span>
          ) : (
            <span className="text-sm text-red-700">
              ({overdueTasks.length} {taskCountText})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-red-700">
          <span className="text-sm">
            {isCollapsed ? 'rozwiń' : 'zwiń'}
          </span>
          {isCollapsed ? <CaretDown size={20} /> : <CaretUp size={20} />}
        </div>
      </button>

      {/* Content - shows when expanded */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-red-700">
            ⚠️ Zadecyduj czy robić dziś
          </p>

          <div className="space-y-2">
            {overdueTasks.map(task => {
              const daysOverdueText = task.due_date 
                ? getDaysOverdueText(task.due_date, selectedDate)
                : 'brak terminu'

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg p-3 border border-red-200 space-y-2 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">🔴</span>
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="text-red-600 font-medium">{daysOverdueText}</span>
                        <span>•</span>
                        <span>⏱ {task.estimate_min}min</span>
                        <span>•</span>
                        <span>📊 P:{task.priority}</span>
                        {task.context_type && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                              {task.context_type}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => onKeepToday(task)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <CheckCircle size={14} />
                      <span>+ Dziś</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPostpone(task)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <CalendarBlank size={14} />
                      <span>📅</span>
                    </Button>
                    {onOpenContextMenu && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenContextMenu(task)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <DotsThree size={14} weight="bold" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
