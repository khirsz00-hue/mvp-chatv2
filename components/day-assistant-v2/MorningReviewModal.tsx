/**
 * MorningReviewModal Component
 * Beautiful, functional modal to review overdue tasks
 * Mobile-optimized with thumb-friendly bottom action bar
 */

'use client'

import { useState, useEffect } from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { getDaysOverdueText } from '@/hooks/useOverdueTasks'
import { getTasksPlural } from '@/lib/utils/polishText'
import Button from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { TaskBadges } from './TaskBadges'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  CalendarBlank, 
  Trash, 
  ArrowRight,
  X,
  Check,
  Clock,
  Lightning,
  Brain
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
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header with gradient */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 border-b border-red-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-3 text-2xl md:text-3xl font-bold">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-3xl"
                >
                  🌅
                </motion.span>
                <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Dzień dobry!
                </span>
              </DialogTitle>
              <p className="text-sm md:text-base text-gray-600 mt-2">
                Masz <span className="font-bold text-red-600">{remainingTasks.length}</span> przeterminowane {getTasksPlural(remainingTasks.length)}
              </p>
            </div>
            <button
              onClick={handleReviewLater}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white/50 rounded-lg"
            >
              <X size={24} weight="bold" />
            </button>
          </div>

          {/* Quick stats bar */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full text-sm">
              <Clock size={16} className="text-orange-600" weight="bold" />
              <span className="font-medium text-gray-700">
                {remainingTasks.reduce((sum, t) => sum + (t.estimate_min || 0), 0)} min łącznie
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full text-sm">
              <Lightning size={16} className="text-red-600" weight="bold" />
              <span className="font-medium text-gray-700">
                {remainingTasks.filter(t => t.priority <= 2).length} pilnych
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full text-sm">
              <Brain size={16} className="text-purple-600" weight="bold" />
              <span className="font-medium text-gray-700">
                {(remainingTasks.reduce((sum, t) => sum + (t.cognitive_load || 2), 0) / remainingTasks.length).toFixed(1)} avg obciążenie
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-24 md:pb-6">
          {/* Bulk actions bar - Desktop */}
          {remainingTasks.length > 0 && (
            <div className="hidden md:flex flex-wrap items-center gap-2 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 mb-4 shadow-sm">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleAll}
                className="flex items-center gap-2 hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.size === remainingTasks.length && remainingTasks.length > 0}
                  readOnly
                  className="cursor-pointer pointer-events-none w-4 h-4"
                />
                <span className="font-medium">{selectedTasks.size === remainingTasks.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}</span>
              </Button>

              <AnimatePresence>
                {selectedTasks.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-2 ml-auto"
                  >
                    <span className="text-sm font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg">
                      Zaznaczono: {selectedTasks.size}
                    </span>
                    <Button
                      size="sm"
                      onClick={handleBulkComplete}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Check size={16} weight="bold" />
                      <span>Ukończ</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkReschedule}
                      className="flex items-center gap-2 hover:bg-white"
                    >
                      <CalendarBlank size={16} weight="bold" />
                      <span>Przenieś</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash size={16} weight="bold" />
                      <span>Usuń</span>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tasks list */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {remainingTasks.map((task, index) => {
                const daysOverdueText = task.due_date 
                  ? getDaysOverdueText(task.due_date, selectedDate)
                  : 'brak terminu'
                const isSelected = selectedTasks.has(task.id)

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                    className={`group relative bg-white border-2 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${
                      isSelected 
                        ? 'border-purple-400 ring-4 ring-purple-100' 
                        : 'border-red-100 hover:border-red-200'
                    }`}
                  >
                    {/* Task header */}
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTask(task.id)}
                        className="mt-1.5 cursor-pointer w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-2xl">🔴</span>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-900 line-clamp-2">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Overdue badge */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold mb-3">
                          <Clock size={14} weight="bold" />
                          <span>Termin: {daysOverdueText}</span>
                        </div>

                        {/* Task metadata - compact badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <TaskBadges task={task} today={selectedDate} />
                        </div>
                      </div>
                    </div>

                    {/* Desktop action buttons */}
                    <div className="hidden md:flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                      <Button
                        size="sm"
                        onClick={() => handleAction(task, 'complete')}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check size={16} weight="bold" />
                        <span className="font-medium">Ukończ</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(task, 'today')}
                        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <CheckCircle size={16} weight="bold" />
                        <span className="font-medium">Dodaj na dziś</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(task, 'tomorrow')}
                        className="flex items-center gap-1.5 hover:bg-gray-50"
                      >
                        <ArrowRight size={16} weight="bold" />
                        <span className="font-medium">Jutro</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(task, 'reschedule')}
                        className="flex items-center gap-1.5 hover:bg-gray-50"
                      >
                        <CalendarBlank size={16} weight="bold" />
                        <span className="font-medium">Przenieś</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(task, 'delete')}
                        className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 ml-auto"
                      >
                        <Trash size={16} weight="bold" />
                        <span className="font-medium">Usuń</span>
                      </Button>
                    </div>

                    {/* Mobile action buttons - hidden, shown in bottom bar when selected */}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Desktop review later button */}
          <div className="hidden md:flex justify-center pt-6 mt-6 border-t">
            <Button
              variant="ghost"
              onClick={handleReviewLater}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <X size={18} weight="bold" />
              <span className="font-medium">Przejrzę później</span>
            </Button>
            <p className="text-xs text-center text-gray-500 mt-2 ml-3">
              Zadania zostaną w sekcji przeterminowane
            </p>
          </div>
        </div>

        {/* Mobile bottom action bar - fixed at bottom, thumb-friendly */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50">
          <div className="px-4 py-3 space-y-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
            {/* Selected task counter and bulk toggle */}
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleAll}
                className="flex items-center gap-2 h-10"
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.size === remainingTasks.length && remainingTasks.length > 0}
                  readOnly
                  className="cursor-pointer pointer-events-none w-4 h-4"
                />
                <span className="text-sm font-medium">
                  {selectedTasks.size > 0 ? `${selectedTasks.size} zaznaczonych` : 'Zaznacz wszystkie'}
                </span>
              </Button>

              {selectedTasks.size === 0 && (
                <button
                  onClick={handleReviewLater}
                  className="text-sm text-gray-600 font-medium px-3 py-2 hover:bg-gray-100 rounded-lg"
                >
                  Przejrzę później
                </button>
              )}
            </div>

            {/* Action buttons - single task or bulk */}
            <AnimatePresence mode="wait">
              {selectedTasks.size === 1 ? (
                <motion.div
                  key="single"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-3 gap-2"
                >
                  {(() => {
                    const task = remainingTasks.find(t => selectedTasks.has(t.id))
                    if (!task) return null
                    return (
                      <>
                        <button
                          onClick={() => handleAction(task, 'complete')}
                          className="flex flex-col items-center gap-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all active:scale-95"
                        >
                          <Check size={20} weight="bold" />
                          <span className="text-xs">Ukończ</span>
                        </button>
                        <button
                          onClick={() => handleAction(task, 'today')}
                          className="flex flex-col items-center gap-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all active:scale-95"
                        >
                          <CheckCircle size={20} weight="bold" />
                          <span className="text-xs">Na dziś</span>
                        </button>
                        <button
                          onClick={() => handleAction(task, 'tomorrow')}
                          className="flex flex-col items-center gap-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all active:scale-95"
                        >
                          <ArrowRight size={20} weight="bold" />
                          <span className="text-xs">Jutro</span>
                        </button>
                        <button
                          onClick={() => handleAction(task, 'reschedule')}
                          className="flex flex-col items-center gap-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-all active:scale-95"
                        >
                          <CalendarBlank size={20} weight="bold" />
                          <span className="text-xs">Przenieś</span>
                        </button>
                        <button
                          onClick={() => handleAction(task, 'delete')}
                          className="flex flex-col items-center gap-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all active:scale-95 col-span-2"
                        >
                          <Trash size={20} weight="bold" />
                          <span className="text-xs">Usuń zadanie</span>
                        </button>
                      </>
                    )
                  })()}
                </motion.div>
              ) : selectedTasks.size > 1 ? (
                <motion.div
                  key="bulk"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-3 gap-2"
                >
                  <button
                    onClick={handleBulkComplete}
                    className="flex flex-col items-center gap-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all active:scale-95"
                  >
                    <Check size={20} weight="bold" />
                    <span className="text-xs">Ukończ wszystkie</span>
                  </button>
                  <button
                    onClick={handleBulkReschedule}
                    className="flex flex-col items-center gap-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all active:scale-95"
                  >
                    <CalendarBlank size={20} weight="bold" />
                    <span className="text-xs">Przenieś</span>
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex flex-col items-center gap-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all active:scale-95"
                  >
                    <Trash size={20} weight="bold" />
                    <span className="text-xs">Usuń wszystkie</span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>

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
    </>
  )
}
