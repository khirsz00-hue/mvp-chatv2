/**
 * MorningReviewModal Component
 * Shows once daily to review overdue tasks and decide what to do with them
 */

'use client'

import { useState, useEffect } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { getDaysOverdueText } from '@/hooks/useOverdueTasks'
import { getTasksPlural } from '@/lib/utils/polishText'
import Button from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { TaskBadges } from './TaskBadges'
import { 
  CheckCircle, 
  CalendarBlank, 
  Trash, 
  ArrowRight,
  X 
} from '@phosphor-icons/react'

interface MorningReviewModalProps {
  overdueTasks: TestDayTask[]
  selectedDate: string
  onAddToday: (task: TestDayTask) => void
  onMoveToTomorrow: (task: TestDayTask) => void
  onReschedule: (task: TestDayTask) => void
  onDelete: (task: TestDayTask) => void
}

/**
 * Get localStorage key for today's review status
 */
function getReviewKey(date: string): string {
  return `overdue_reviewed_${date}`
}

/**
 * Check if user has reviewed overdue tasks today
 */
function hasReviewedToday(date: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(getReviewKey(date)) === 'true'
}

/**
 * Mark today's review as complete
 */
function markReviewedToday(date: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(getReviewKey(date), 'true')
}

export function MorningReviewModal({
  overdueTasks,
  selectedDate,
  onAddToday,
  onMoveToTomorrow,
  onReschedule,
  onDelete
}: MorningReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [processedTasks, setProcessedTasks] = useState<Set<string>>(new Set())

  // Check if we should show the modal on mount
  useEffect(() => {
    const shouldShow = 
      overdueTasks.length > 0 && 
      !hasReviewedToday(selectedDate)
    
    if (shouldShow) {
      setIsOpen(true)
    }
  }, [overdueTasks.length, selectedDate])

  // Reset processed tasks when date changes
  useEffect(() => {
    setProcessedTasks(new Set())
  }, [selectedDate])

  const handleReviewLater = () => {
    markReviewedToday(selectedDate)
    setIsOpen(false)
  }

  const handleAction = (task: TestDayTask, action: 'today' | 'tomorrow' | 'reschedule' | 'delete') => {
    // Mark task as processed first
    const newProcessedTasks = new Set(processedTasks).add(task.id)
    setProcessedTasks(newProcessedTasks)

    // Execute action
    switch (action) {
      case 'today':
        onAddToday(task)
        break
      case 'tomorrow':
        onMoveToTomorrow(task)
        break
      case 'reschedule':
        onReschedule(task)
        break
      case 'delete':
        onDelete(task)
        break
    }

    // If all tasks processed, close modal
    if (newProcessedTasks.size >= overdueTasks.length) {
      markReviewedToday(selectedDate)
      setIsOpen(false)
    }
  }

  // Filter out processed tasks
  const remainingTasks = overdueTasks.filter(task => !processedTasks.has(task.id))

  // Don't render if no tasks or already reviewed
  if (overdueTasks.length === 0 || !isOpen) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>🌅</span>
            <span>Dzień dobry! Masz {remainingTasks.length} przeterminowane {getTasksPlural(remainingTasks.length)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            ⚠️ Przejrzyj i zdecyduj co zrobić z przeterminowanymi zadaniami:
          </p>

          <div className="space-y-3">
            {remainingTasks.map(task => {
              const daysOverdueText = task.due_date 
                ? getDaysOverdueText(task.due_date, selectedDate)
                : 'brak terminu'

              return (
                <div
                  key={task.id}
                  className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-3"
                >
                  {/* Task info */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">🔴</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900">{task.title}</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Termin: {daysOverdueText}
                        </p>
                      </div>
                    </div>

                    {/* Task metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-red-800">
                      <TaskBadges task={task} today={selectedDate} />
                      <span>⏱ {task.estimate_min} min</span>
                      <span>📊 Priorytet: {task.priority}</span>
                      {task.context_type && (
                        <span className="px-2 py-0.5 bg-red-100 rounded">
                          🏷️ {task.context_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(task, 'today')}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle size={16} />
                      <span>Dodaj na dziś</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(task, 'tomorrow')}
                      className="flex items-center gap-1"
                    >
                      <ArrowRight size={16} />
                      <span>Jutro</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(task, 'reschedule')}
                      className="flex items-center gap-1"
                    >
                      <CalendarBlank size={16} />
                      <span>Przenieś</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(task, 'delete')}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash size={16} />
                      <span>Usuń</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Review later button */}
          <div className="flex justify-center pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleReviewLater}
              className="flex items-center gap-2"
            >
              <X size={16} />
              <span>Przejrzę później</span>
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Zadania zostaną w sekcji przeterminowane
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
