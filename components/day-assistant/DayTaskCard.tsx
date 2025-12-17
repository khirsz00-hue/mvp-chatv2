'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { 
  Fire, 
  Snowflake, 
  PushPin, 
  CheckCircle, 
  Clock,
  Brain,
  Timer,
  ChatCircle
} from '@phosphor-icons/react'
import { DayTask, DayPriority, TASK_ACTION_EMOJI } from '@/lib/types/dayAssistant'
import { cn } from '@/lib/utils'
import { useTaskTimer } from '@/components/assistant/TaskTimer'

interface DayTaskCardProps {
  task: DayTask
  section: DayPriority
  onPin: () => void
  onPostpone: () => void
  onEscalate: () => void
  onComplete: () => void
  onGenerateSubtasks: () => void
  onStartTimer?: () => void
  onOpenChat?: () => void
}

/**
 * Task Card for Day Assistant
 * 
 * Displays task with action buttons (📌🧊🔥)
 */
export function DayTaskCard({
  task,
  section,
  onPin,
  onPostpone,
  onEscalate,
  onComplete,
  onGenerateSubtasks,
  onStartTimer,
  onOpenChat
}: DayTaskCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [showSubtasks, setShowSubtasks] = useState(section === 'now')
  const { startTimer } = useTaskTimer()

  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0
  const totalSubtasks = task.subtasks?.length || 0
  
  const handleStartTimer = () => {
    if (onStartTimer) {
      onStartTimer()
    } else {
      startTimer(task.id, task.title)
    }
  }

  return (
    <Card 
      className={cn(
        'transition-all hover:shadow-md',
        task.is_mega_important && 'border-2 border-red-500',
        task.is_pinned && 'border-2 border-brand-purple'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Task Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{task.title}</h3>
              
              {/* Badges */}
              <div className="flex gap-1">
                {task.is_mega_important && (
                  <Badge variant="destructive" className="text-xs">
                    {TASK_ACTION_EMOJI.mega_important} Mega ważne
                  </Badge>
                )}
                {task.is_pinned && (
                  <Badge variant="default" className="text-xs">
                    {TASK_ACTION_EMOJI.pin_today} Przypięte
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {task.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {task.estimated_duration} min
              </span>
              
              {hasSubtasks && (
                <span 
                  className="flex items-center gap-1 cursor-pointer hover:text-brand-purple"
                  onClick={() => setShowSubtasks(!showSubtasks)}
                >
                  <CheckCircle size={16} />
                  {completedSubtasks}/{totalSubtasks} kroków
                </span>
              )}
            </div>

            {/* Subtasks */}
            {showSubtasks && hasSubtasks && (
              <div className="mt-3 space-y-2 pl-4 border-l-2 border-brand-purple/20">
                {task.subtasks!.map((subtask) => (
                  <div 
                    key={subtask.id}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      subtask.completed && 'text-muted-foreground line-through'
                    )}
                  >
                    <CheckCircle 
                      size={16} 
                      weight={subtask.completed ? 'fill' : 'regular'}
                      className={subtask.completed ? 'text-green-500' : ''}
                    />
                    <span>{subtask.content}</span>
                    <span className="text-xs text-muted-foreground">
                      ({subtask.estimated_duration} min)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={cn(
            'flex flex-col gap-2 transition-opacity',
            showActions || section === 'now' ? 'opacity-100' : 'opacity-0'
          )}>
            {/* 💬 Chat */}
            {onOpenChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenChat}
                title="Otwórz czat o zadaniu"
                className="text-blue-600 hover:bg-blue-50"
              >
                <ChatCircle size={20} />
              </Button>
            )}

            {/* ⏱️ Timer */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartTimer}
              title="Włącz timer"
              className="text-purple-600 hover:bg-purple-50"
            >
              <Timer size={20} />
            </Button>

            {/* 🧠 Generate Subtasks */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerateSubtasks}
              title="Generuj kroki AI"
            >
              <Brain size={20} />
            </Button>

            {/* 🔥 MEGA IMPORTANT */}
            {!task.is_mega_important && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEscalate}
                title="🔥 Mega ważne"
                className="text-red-600 hover:bg-red-50"
              >
                <Fire size={20} weight="fill" />
              </Button>
            )}

            {/* 📌 MUST TODAY */}
            {!task.is_pinned && section !== 'now' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPin}
                title="📌 Musi dziś"
                className="text-brand-purple hover:bg-purple-50"
              >
                <PushPin size={20} weight="fill" />
              </Button>
            )}

            {/* 🧊 NOT TODAY */}
            {section !== 'later' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPostpone}
                title="🧊 Nie dziś"
                className="text-blue-600 hover:bg-blue-50"
              >
                <Snowflake size={20} weight="fill" />
              </Button>
            )}

            {/* ✅ Complete */}
            {(section === 'now' || section === 'later') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onComplete}
                title="Oznacz jako ukończone"
                className="text-green-600 hover:bg-green-50"
              >
                <CheckCircle size={20} weight="fill" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
