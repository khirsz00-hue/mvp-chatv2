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
  X,
  Check
} from '@phosphor-icons/react'

interface MorningReviewModalProps {
  overdueTasks: TestDayTask[]
  selectedDate: string
  isOpen: boolean
  onClose: () => void
  onAddToday: (task: TestDayTask) => void
  onMoveToTomorrow: (task: TestDayTask) => void
  onReschedule: (task: TestDayTask, date?: string) => void
  onDelete: (task: TestDayTask) => void
  onComplete: (task: TestDayTask) => void
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
  isOpen,
  onClose,
  onAddToday,
  onMoveToTomorrow,
  onReschedule,
  onDelete,
  onComplete
}: MorningReviewModalProps) {
  const [processedTasks, setProcessedTasks] = useState<Set<string>>(new Set())
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null)
  const [isBulkReschedule, setIsBulkReschedule] = useState(false)

  // Reset processed tasks and selected tasks when date changes
  useEffect(() => {
    setProcessedTasks(new Set())
    setSelectedTasks(new Set())
  }, [selectedDate])

  const handleReviewLater = () => {
    markReviewedToday(selectedDate)
    onClose()
  }

  const handleAction = (task: TestDayTask, action: 'today' | 'tomorrow' | 'reschedule' | 'delete' | 'complete') => {
    // Mark task as processed first
    const newProcessedTasks = new Set(processedTasks).add(task.id)
    setProcessedTasks(newProcessedTasks)

    // Remove from selected tasks if it was selected
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      newSet.delete(task.id)
      return newSet
    })

    // Execute action
    switch (action) {
      case 'today':
        onAddToday(task)
        break
      case 'tomorrow':
        onMoveToTomorrow(task)
        break
      case 'reschedule':
        // Open date picker for this specific task
        setRescheduleTaskId(task.id)
        setIsBulkReschedule(false)
        setShowDatePicker(true)
        return // Don't check for remaining tasks yet
      case 'delete':
        onDelete(task)
        break
      case 'complete':
        onComplete(task)
        break
    }

    // Check if all remaining tasks are processed
    const remainingAfterAction = overdueTasks.filter(t => !newProcessedTasks.has(t.id))
    if (remainingAfterAction.length === 0) {
      markReviewedToday(selectedDate)
      onClose()
    }
  }

  const handleRescheduleConfirm = () => {
    if (!rescheduleDate) return

    if (isBulkReschedule) {
      // Bulk reschedule - batch state update
      const tasksToReschedule = remainingTasks.filter(t => selectedTasks.has(t.id))
      const newProcessedTasks = new Set(processedTasks)
      tasksToReschedule.forEach(task => {
        newProcessedTasks.add(task.id)
        onReschedule(task, rescheduleDate)
      })
      setProcessedTasks(newProcessedTasks)
      setSelectedTasks(new Set())
    } else if (rescheduleTaskId) {
      // Single task reschedule
      const task = overdueTasks.find(t => t.id === rescheduleTaskId)
      if (task) {
        const newProcessedTasks = new Set(processedTasks).add(task.id)
        setProcessedTasks(newProcessedTasks)
        onReschedule(task, rescheduleDate)
      }
    }

    setShowDatePicker(false)
    setRescheduleDate('')
    setRescheduleTaskId(null)
    setIsBulkReschedule(false)

    // Check if all tasks are processed
    const newProcessedSet = new Set(processedTasks)
    if (isBulkReschedule) {
      selectedTasks.forEach(id => newProcessedSet.add(id))
    } else if (rescheduleTaskId) {
      newProcessedSet.add(rescheduleTaskId)
    }
    
    const remainingAfterReschedule = overdueTasks.filter(t => !newProcessedSet.has(t.id))
    if (remainingAfterReschedule.length === 0) {
      markReviewedToday(selectedDate)
      onClose()
    }
  }

  const handleToggleTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleToggleAll = () => {
    if (selectedTasks.size === remainingTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(remainingTasks.map(t => t.id)))
    }
  }

  const handleBulkComplete = () => {
    const tasksToComplete = remainingTasks.filter(t => selectedTasks.has(t.id))
    
    // Batch state update - update processed tasks once
    const newProcessedTasks = new Set(processedTasks)
    tasksToComplete.forEach(task => {
      newProcessedTasks.add(task.id)
      onComplete(task)
    })
    setProcessedTasks(newProcessedTasks)
    setSelectedTasks(new Set())

    // Check if all tasks are processed after bulk complete
    const remainingAfterBulk = overdueTasks.filter(t => !newProcessedTasks.has(t.id))
    if (remainingAfterBulk.length === 0) {
      markReviewedToday(selectedDate)
      onClose()
    }
  }

  const handleBulkDelete = () => {
    const tasksToDelete = remainingTasks.filter(t => selectedTasks.has(t.id))
    
    // Batch state update - update processed tasks once
    const newProcessedTasks = new Set(processedTasks)
    tasksToDelete.forEach(task => {
      newProcessedTasks.add(task.id)
      onDelete(task)
    })
    setProcessedTasks(newProcessedTasks)
    setSelectedTasks(new Set())

    // Check if all tasks are processed after bulk delete
    const remainingAfterBulk = overdueTasks.filter(t => !newProcessedTasks.has(t.id))
    if (remainingAfterBulk.length === 0) {
      markReviewedToday(selectedDate)
      onClose()
    }
  }

  const handleBulkReschedule = () => {
    setIsBulkReschedule(true)
    setRescheduleTaskId(null)
    setShowDatePicker(true)
  }

  // Filter out processed tasks
  const remainingTasks = overdueTasks.filter(task => !processedTasks.has(task.id))

  // Don't render if no tasks
  if (overdueTasks.length === 0) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          {/* Bulk actions bar */}
          {remainingTasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleAll}
                className="flex items-center gap-1"
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.size === remainingTasks.length && remainingTasks.length > 0}
                  readOnly
                  className="cursor-pointer pointer-events-none"
                />
                <span>{selectedTasks.size === remainingTasks.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}</span>
              </Button>

              {selectedTasks.size > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    Zaznaczono: {selectedTasks.size}
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="sm"
                      onClick={handleBulkComplete}
                      className="flex items-center gap-1"
                    >
                      <Check size={16} />
                      <span>Ukończ zaznaczone</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkReschedule}
                      className="flex items-center gap-1"
                    >
                      <CalendarBlank size={16} />
                      <span>Przenieś zaznaczone</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash size={16} />
                      <span>Usuń zaznaczone</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            {remainingTasks.map(task => {
              const daysOverdueText = task.due_date 
                ? getDaysOverdueText(task.due_date, selectedDate)
                : 'brak terminu'
              const isSelected = selectedTasks.has(task.id)

              return (
                <div
                  key={task.id}
                  className={`bg-red-50 border-2 rounded-lg p-4 space-y-3 ${
                    isSelected ? 'border-brand-purple' : 'border-red-200'
                  }`}
                >
                  {/* Task info */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTask(task.id)}
                        className="mt-1 cursor-pointer"
                      />
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
                      onClick={() => handleAction(task, 'complete')}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check size={16} />
                      <span>Ukończ</span>
                    </Button>
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

      {/* Date Picker Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isBulkReschedule 
                ? `Wybierz datę dla ${selectedTasks.size} ${getTasksPlural(selectedTasks.size)}`
                : 'Wybierz nową datę'
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nowa data:
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={selectedDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDatePicker(false)
                  setRescheduleDate('')
                  setRescheduleTaskId(null)
                  setIsBulkReschedule(false)
                }}
              >
                Anuluj
              </Button>
              <Button
                onClick={handleRescheduleConfirm}
                disabled={!rescheduleDate}
              >
                Potwierdź
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
