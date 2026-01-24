'use client'

import { useState, useEffect, useRef } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { CalendarBlank, CheckCircle, Trash, DotsThree, Circle, CheckSquare, ChatCircle, Brain, Timer as TimerIcon, Stop } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { format, parseISO, addDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useTaskTimer } from './TaskTimer'
import { TaskChatModal } from './TaskChatModal'
import { HelpMeModal } from '@/components/day-assistant-v2/HelpMeModal'
import { useToast } from '@/components/ui/Toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

interface Subtask {
  id: string
  content: string
  completed: boolean
}

interface Task {
  id: string
  content: string
  description?:  string
  project_id?:  string
  priority:  1 | 2 | 3 | 4
  due?:  { date: string } | string
  completed?: boolean
  created_at?: string
  subtasks?: Subtask[]
}

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => Promise<void>
  onDelete:  (id: string) => Promise<void>
  onDetails: (task: Task) => void
  onMove?: (id: string, newDate: string) => Promise<void>
  showCheckbox?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelection?: (taskId: string) => void
}

const DESCRIPTION_PREVIEW_LENGTH = 150

export function TaskCard({ 
  task, 
  onComplete, 
  onDelete, 
  onDetails,
  onMove,
  showCheckbox = true,
  selectable = false,
  selected = false,
  onToggleSelection
}: TaskCardProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasActiveTimer, setHasActiveTimer] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAITooltip, setShowAITooltip] = useState(false)
  const [aiUnderstanding, setAiUnderstanding] = useState<string>('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [mobileMenuPosition, setMobileMenuPosition] = useState<'top' | 'bottom'>('bottom')
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuContentRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileDatePicker, setShowMobileDatePicker] = useState(false)
  
  const { startTimer, stopTimer, getActiveTimer } = useTaskTimer()
  const { showToast } = useToast()
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Check if this task has an active timer
  useEffect(() => {
    const checkTimer = () => {
      const activeTimer = getActiveTimer()
      setHasActiveTimer(activeTimer.taskId === task.id && activeTimer.isActive)
    }
    
    checkTimer()
    
    // Listen for custom timer events (same tab) and storage events (other tabs)
    const handleTimerChange = () => checkTimer()
    window.addEventListener('timerStateChanged', handleTimerChange)
    window.addEventListener('storage', handleTimerChange)
    
    return () => {
      window.removeEventListener('timerStateChanged', handleTimerChange)
      window.removeEventListener('storage', handleTimerChange)
    }
  }, [task.id, getActiveTimer])
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false)
      }
    }
    
    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMobileMenu])
  
  // Collision detection for mobile menu
  useEffect(() => {
    if (!showMobileMenu || !mobileMenuContentRef.current) return

    const checkCollision = () => {
      const content = mobileMenuContentRef.current
      if (!content) return

      const rect = content.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const collisionPadding = 20

      // Check if menu would clip at bottom
      const wouldClipBottom = rect.bottom > viewportHeight - collisionPadding
      // Check if menu would clip at top
      const wouldClipTop = rect.top < collisionPadding

      // Determine best side
      if (wouldClipBottom && !wouldClipTop) {
        setMobileMenuPosition('top')
      } else {
        setMobileMenuPosition('bottom')
      }
    }

    // Check immediately and on scroll/resize
    checkCollision()
    window.addEventListener('scroll', checkCollision, true)
    window.addEventListener('resize', checkCollision)

    return () => {
      window.removeEventListener('scroll', checkCollision, true)
      window.removeEventListener('resize', checkCollision)
    }
  }, [showMobileMenu])
  
  const priorityColors = {
    1: 'border-l-red-500 bg-red-50/50',
    2: 'border-l-orange-500 bg-orange-50/50',
    3: 'border-l-blue-500 bg-blue-50/50',
    4: 'border-l-gray-300 bg-white'
  }
  
  const priorityLabels = {
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4'
  }
  
  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await onComplete(task.id)
    } catch (err) {
      console.error('Error completing task:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (! confirm('Czy na pewno chcesz usunąć to zadanie?')) return
    
    setDeleting(true)
    try {
      await onDelete(task.id)
    } catch (err) {
      console.error('Error deleting task:', err)
      setDeleting(false)
    }
  }
  
  const handleStartStopTimer = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasActiveTimer) {
      // Stop the timer
      stopTimer()
    } else {
      // Start the timer
      startTimer(task.id, task.content)
    }
  }
  
  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowChatModal(true)
  }
  
  const handleHelpClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowHelpModal(true)
  }
  
  const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
  const dueInputValue = dueStr ? dueStr.split('T')[0] : ''

  const openDatePicker = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    
    // On mobile, show custom modal
    if (isMobile) {
      setShowMobileDatePicker(true)
      return
    }
    
    // Desktop: use native picker
    const input = datePickerRef.current
    if (!input) return
    
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
      } catch (err) {
        input.click()
      }
    } else {
      input.click()
    }
  }

  const handleDueDateChange = async (value: string) => {
    if (!value) return
    
    console.log('📅 Date changed:', { taskId: task.id, newDate: value })
    
    if (onMove) {
      try {
        await onMove(task.id, value)
        showToast('Zadanie przeniesione', 'success')
      } catch (error) {
        console.error('Failed to move task:', error)
        showToast('Nie udało się przenieść zadania', 'error')
      }
    } else {
      console.warn('⚠️ onMove callback not provided')
    }
  }
  
  // Calculate subtasks progress
  const subtasksTotal = task.subtasks?.length || 0
  const subtasksCompleted = task.subtasks?. filter(s => s.completed).length || 0
  const subtasksProgress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0
  
  return (
    <Card 
      className={cn(
        'p-2 md:p-3 border-l-4 transition-all hover:shadow-md group cursor-pointer',
        priorityColors[task.priority] || priorityColors[4],
        loading && 'opacity-50 pointer-events-none',
        deleting && 'opacity-0 scale-95',
        selected && 'ring-2 ring-brand-purple bg-brand-purple/5'
      )}
      onClick={() => onDetails(task)}
    >
      <div className="flex items-start gap-2">
        {/* Selection checkbox - shown when bulk selection is active */}
        {selectable && onToggleSelection && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelection(task.id)
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 text-brand-purple border-gray-300 rounded focus:ring-brand-purple cursor-pointer flex-shrink-0"
          />
        )}
        
        {/* Quick complete checkbox - shown in normal mode (not during bulk selection) */}
        {!selectable && showCheckbox && (
          <button 
            onClick={handleComplete}
            disabled={loading}
            className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
            title="Ukończ zadanie"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            ) : (
              <Circle 
                size={20} 
                weight="bold"
                className="text-gray-400 group-hover:text-green-600 transition-colors" 
              />
            )}
          </button>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm sm:text-base line-clamp-2 md:line-clamp-1 break-words group-hover:text-brand-purple transition-colors">
            {task.content}
          </h3>
          
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-1 break-words">
              {task.description}
            </p>
          )}
          
          {/* Subtasks progress */}
          {subtasksTotal > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <CheckSquare size={14} />
                <span>{subtasksCompleted} / {subtasksTotal} ukończone</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1. 5">
                <div 
                  className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width:  `${subtasksProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Footer badges */}
          <div className="flex gap-1.5 md:gap-2 mt-1.5 md:mt-2 flex-wrap items-center">
            {hasActiveTimer && (
              <Badge className="gap-1 text-xs bg-red-500 text-white animate-pulse">
                <div className="w-2 h-2 rounded-full bg-white" />
                Live
              </Badge>
            )}
            
            {dueStr && (
              <>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={dueInputValue}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="sr-only"
                />
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs cursor-pointer" 
                  onClick={openDatePicker}
                  style={{ touchAction: 'manipulation' }}
                >
                  <CalendarBlank size={12} className="md:hidden" />
                  <CalendarBlank size={14} className="hidden md:inline" />
                  {format(parseISO(dueStr), 'dd MMM', { locale: pl })}
                </Badge>
              </>
            )}
            
            {task.priority && task.priority < 4 && (
              <Badge 
                variant={task.priority === 1 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {priorityLabels[task. priority]}
              </Badge>
            )}
            
            {/* AI Understanding Tooltip */}
            {task.description && (
              <div className="relative">
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs cursor-pointer border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  onMouseEnter={() => setShowAITooltip(true)}
                  onMouseLeave={() => setShowAITooltip(false)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDetails(task)
                  }}
                  title="Kliknij aby zobaczyć pełną analizę AI"
                >
                  <Brain size={12} weight="fill" />
                  AI
                </Badge>
                
                {showAITooltip && (
                  <div className="absolute z-50 left-0 top-full mt-2 w-64 p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs rounded-lg shadow-xl pointer-events-none">
                    <div className="font-semibold mb-1 flex items-center gap-1">
                      <Brain size={14} weight="fill" />
                      Jak AI rozumie zadanie
                    </div>
                    <div className="text-purple-100">
                      {task.description?.substring(0, DESCRIPTION_PREVIEW_LENGTH)}{task.description && task.description.length > DESCRIPTION_PREVIEW_LENGTH ? '...' : ''}
                    </div>
                    <div className="text-xs text-purple-200 mt-2">
                      💡 Kliknij na badge aby zobaczyć pełną analizę AI
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions on the Right */}
        {/* Desktop: Show all icons */}
        <div className="hidden md:flex gap-1 flex-shrink-0 ml-2 items-center">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleHelpClick}
            title="Pomoc AI"
            className="p-2 h-auto"
          >
            <Brain size={18} weight="bold" className="text-purple-600" />
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleChatClick}
            title="Czat AI"
            className="p-2 h-auto"
          >
            <ChatCircle size={18} weight="bold" className="text-blue-600" />
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleStartStopTimer}
            title={hasActiveTimer ? 'Stop Timer' : 'Start Timer'}
            className="p-2 h-auto"
          >
            {hasActiveTimer ? (
              <Stop size={18} weight="fill" className="text-red-600" />
            ) : (
              <TimerIcon size={18} weight="fill" className="text-purple-600" />
            )}
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleComplete}
            title="Ukończ"
            className="p-2 h-auto"
          >
            <CheckCircle size={18} weight="bold" className="text-green-600" />
          </Button>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleDelete}
            title="Usuń"
            className="p-2 h-auto"
          >
            <Trash size={18} weight="bold" className="text-red-600" />
          </Button>
        </div>
        
        {/* Mobile: Show context menu */}
        <div className="md:hidden relative flex-shrink-0 ml-2 z-40" ref={mobileMenuRef}>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              setShowMobileMenu(!showMobileMenu)
            }}
            title="Więcej opcji"
            className="p-2 h-auto"
          >
            <DotsThree size={20} weight="bold" className="text-gray-600" />
          </Button>
          
          {showMobileMenu && (
            <div 
              ref={mobileMenuContentRef}
              className={cn(
                "absolute right-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 animate-scale-in",
                mobileMenuPosition === 'top' ? 'bottom-full' : 'top-full'
              )}
              style={{
                marginTop: mobileMenuPosition === 'bottom' ? '4px' : undefined,
                marginBottom: mobileMenuPosition === 'top' ? '4px' : undefined,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleHelpClick(e)
                  setShowMobileMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm transition-colors"
              >
                <Brain size={18} weight="bold" className="text-purple-600" />
                <span>Pomoc AI</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleChatClick(e)
                  setShowMobileMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm transition-colors"
              >
                <ChatCircle size={18} weight="bold" className="text-blue-600" />
                <span>Czat AI</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartStopTimer(e)
                  setShowMobileMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm transition-colors"
              >
                {hasActiveTimer ? (
                  <>
                    <Stop size={18} weight="fill" className="text-red-600" />
                    <span>Stop Timer</span>
                  </>
                ) : (
                  <>
                    <TimerIcon size={18} weight="fill" className="text-purple-600" />
                    <span>Start Timer</span>
                  </>
                )}
              </button>
              
              <div className="border-t border-gray-200 my-1"></div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleComplete(e)
                  setShowMobileMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm transition-colors"
              >
                <CheckCircle size={18} weight="bold" className="text-green-600" />
                <span>Ukończ</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(e)
                  setShowMobileMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-3 text-sm transition-colors text-red-600"
              >
                <Trash size={18} weight="bold" />
                <span>Usuń</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <HelpMeModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        task={{ id: task.id, title: task.content, description: task.description }}
        onSuccess={() => {
          // Refresh tasks after subtasks created
          window.location.reload()
        }}
      />
      
      <TaskChatModal
        open={showChatModal}
        onClose={() => setShowChatModal(false)}
        task={task}
      />

      {/* Mobile Date Picker Modal */}
      {showMobileDatePicker && (
        <Dialog open={showMobileDatePicker} onOpenChange={setShowMobileDatePicker}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Wybierz nową datę</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3">
              {/* Quick date buttons - min 44px dla mobile */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Dziś', value: format(new Date(), 'yyyy-MM-dd') },
                  { label: 'Jutro', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
                  { label: 'Za 3 dni', value: format(addDays(new Date(), 3), 'yyyy-MM-dd') },
                  { label: 'Za tydzień', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') }
                ].map(({ label, value }) => (
                  <Button
                    key={value}
                    variant="outline"
                    onClick={async () => {
                      await handleDueDateChange(value)
                      setShowMobileDatePicker(false)
                    }}
                    className="min-h-[44px]"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              {/* Native date input jako fallback */}
              <div className="pt-2 border-t">
                <label className="text-sm font-medium mb-2 block">Lub wybierz datę:</label>
                <input
                  type="date"
                  value={dueInputValue}
                  onChange={async (e) => {
                    await handleDueDateChange(e.target.value)
                    setShowMobileDatePicker(false)
                  }}
                  className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
