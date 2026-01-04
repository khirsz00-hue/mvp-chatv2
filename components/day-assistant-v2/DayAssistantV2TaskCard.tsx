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
  queuePosition?: number  // Optional - only shown for tasks in queue
  isOverflow?: boolean    // Optional - marks card as overflow (reduced opacity)
  onStartTimer: (taskId: string) => void
  onComplete: (taskId: string) => void
  onHelp: (taskId: string) => void
  onPin: (taskId: string) => void
  onPostpone: (taskId: string) => void
  onDelete: (taskId: string) => void
  onOpenDetails: (taskId: string) => void
}

// Helper function to get priority border color
function getPriorityBorderColor(priority: number): string {
  const borderColors = {
    4: 'border-l-orange-500',  // P1 - orange
    3: 'border-l-blue-500',    // P2 - blue
    2: 'border-l-violet-500',  // P3 - violet
    1: 'border-l-slate-300'    // P4 - slate
  }
  return borderColors[priority as keyof typeof borderColors] || borderColors[1]
}

export function DayAssistantV2TaskCard({
  task,
  queuePosition,
  isOverflow = false,
  onStartTimer,
  onComplete,
  onHelp,
  onPin,
  onPostpone,
  onDelete,
  onOpenDetails
}: DayAssistantV2TaskCardProps) {
  const todayDate = new Date().toISOString().split('T')[0]
  const priorityBorderColor = getPriorityBorderColor(task.priority)

  return (
    <Card 
      className={cn(
        "group bg-white border border-slate-200 rounded-xl shadow-sm transition-all cursor-pointer",
        "hover:shadow-md",
        "border-l-4",
        task.is_must ? "border-l-red-600" : priorityBorderColor,
        isOverflow && "opacity-60"
      )}
      onClick={() => onOpenDetails(task.id)}
    >
      <CardContent className="p-4">
        {/* Top Row: Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {queuePosition !== undefined && queuePosition > 0 && (
            <PositionBadge position={queuePosition} />
          )}
          
          {task.is_must && <MustBadge />}
          
          <PriorityBadge priority={task.priority as 1 | 2 | 3 | 4} />
          
          {task.context_type && (
            <ContextBadge 
              context={task.context_type} 
              aiInferred={task.metadata?.ai_inferred_context || false} 
            />
          )}
          
          <CognitiveLoadBadge load={task.cognitive_load} />
          
          <DeadlineBadge dueDate={task.due_date || null} todayDate={todayDate} />
          
          <DurationBadge minutes={task.estimate_min} />
        </div>

        {/* Task Title */}
        <h3 className={cn(
          "font-semibold text-slate-800 mb-2 transition-colors",
          "group-hover:text-indigo-600"
        )}>
          {task.title}
        </h3>

        {/* Description (if exists) - truncated to 1 line */}
        {task.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Bottom Row: Action buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Play Button - Hidden by default, visible on hover */}
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onStartTimer(task.id)
            }}
            className={cn(
              "bg-indigo-600 hover:bg-indigo-700 text-white transition-all",
              "opacity-0 group-hover:opacity-100"
            )}
          >
            <Play size={16} weight="fill" className="mr-1" />
            Start
          </Button>

          {/* Menu Button */}
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

        {/* Postpone alert */}
        <PostponeAlertBanner postponeCount={task.postpone_count} />

        {/* Score tooltip */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <DayAssistantV2TaskTooltip task={task} queuePosition={queuePosition} />
        </div>
      </CardContent>
    </Card>
  )
}
