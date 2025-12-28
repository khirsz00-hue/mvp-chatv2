/**
 * DayAssistantV2TaskCard - Beautiful task card with comprehensive badges
 * Part of Day Assistant V2 Complete Overhaul
 */

import React from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Play } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  PositionBadge,
  MustBadge,
  PriorityBadge,
  DeadlineBadge,
  CognitiveLoadBadge,
  DurationBadge,
  ContextBadge,
  PostponeAlertBanner
} from './DayAssistantV2TaskBadges'
import { DayAssistantV2TaskMenu } from './DayAssistantV2TaskMenu'
import { DayAssistantV2TaskTooltip } from './DayAssistantV2TaskTooltip'

interface DayAssistantV2TaskCardProps {
  task: TestDayTask
  queuePosition: number
  onStartTimer: (taskId: string) => void
  onComplete: (taskId: string) => void
  onHelp: (taskId: string) => void
  onPin: (taskId: string) => void
  onPostpone: (taskId: string) => void
  onDelete: (taskId: string) => void
  onOpenDetails: (taskId: string) => void
}

export function DayAssistantV2TaskCard({
  task,
  queuePosition,
  onStartTimer,
  onComplete,
  onHelp,
  onPin,
  onPostpone,
  onDelete,
  onOpenDetails
}: DayAssistantV2TaskCardProps) {
  const todayDate = new Date().toISOString().split('T')[0]

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        task.is_must && "border-l-4 border-l-red-600"
      )}
      onClick={() => onOpenDetails(task.id)}
    >
      <CardContent className="p-4">
        {/* Header row with all badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <PositionBadge position={queuePosition} />
          
          {task.is_must && <MustBadge />}
          
          <PriorityBadge priority={task.priority as 1 | 2 | 3 | 4} />
          
          <DeadlineBadge dueDate={task.due_date || null} todayDate={todayDate} />
          
          <CognitiveLoadBadge load={task.cognitive_load} />
          
          <DurationBadge minutes={task.estimate_min} />
          
          {task.context_type && (
            <ContextBadge 
              context={task.context_type} 
              aiInferred={task.metadata?.ai_inferred_context || false} 
            />
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center justify-between mb-3">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onStartTimer(task.id)
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Play size={16} weight="fill" className="mr-1" />
            Start
          </Button>

          <DayAssistantV2TaskMenu
            taskId={task.id}
            isMust={task.is_must}
            onStartTimer={onStartTimer}
            onComplete={onComplete}
            onHelp={onHelp}
            onPin={onPin}
            onPostpone={onPostpone}
            onDelete={onDelete}
          />
        </div>

        {/* Task title */}
        <h3 className="font-semibold text-gray-900 mb-2 text-base">
          {task.title}
        </h3>

        {/* Description (if exists) */}
        {task.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Postpone alert */}
        <PostponeAlertBanner postponeCount={task.postpone_count} />

        {/* Score tooltip */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <DayAssistantV2TaskTooltip task={task} queuePosition={queuePosition} />
        </div>
      </CardContent>
    </Card>
  )
}
