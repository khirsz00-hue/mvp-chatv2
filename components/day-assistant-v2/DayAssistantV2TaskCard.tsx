/**
 * DayAssistantV2TaskCard - Beautiful task card with comprehensive badges
 * Part of Day Assistant V2 Complete Overhaul
 */

import React from 'react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { Play, DotsThreeVertical, Tag, Brain, Calendar } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  MustBadge,
  PriorityBadge,
  DeadlineBadge,
  CognitiveLoadBadge,
  ContextBadge,
  PostponeAlertBanner
} from './DayAssistantV2TaskBadges'
import { DayAssistantV2TaskMenu } from './DayAssistantV2TaskMenu'
import { DayAssistantV2TaskTooltip } from './DayAssistantV2TaskTooltip'

interface DayAssistantV2TaskCardProps {
  task: TestDayTask
  queuePosition?: number  // Optional - only shown for tasks in queue
  isOverflow?: boolean    // Optional - marks card as overflow (reduced opacity)
  isCompact?: boolean     // Optional - compact layout for remaining tasks
  onStartTimer: (taskId: string) => void
  onComplete: (taskId: string) => void
  onHelp: (taskId: string) => void
  onPin: (taskId: string) => void
  onPostpone: (taskId: string) => void
  onDelete: (taskId: string) => void
  onOpenDetails: (taskId: string) => void
}

// Constants
const POSTPONE_ALERT_THRESHOLD = 3

// Helper function to get priority border color (bg-* for left border)
function getPriorityBorderColor(priority: number): string {
  const borderColors = {
    1: 'bg-red-500',     // P1 - red (highest priority)
    2: 'bg-orange-500',  // P2 - orange
    3: 'bg-blue-500',    // P3 - blue
    4: 'bg-gray-400'     // P4 - gray (lowest priority)
  }
  return borderColors[priority as keyof typeof borderColors] || borderColors[4]
}

export function DayAssistantV2TaskCard({
  task,
  queuePosition,
  isOverflow = false,
  isCompact = false,
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

  // Overflow tasks have special styling
  if (isOverflow) {
    return (
      <div 
        className="bg-slate-50 p-3 rounded-lg border border-slate-200 relative overflow-hidden opacity-60 group cursor-pointer"
        onClick={() => onOpenDetails(task.id)}
      >
        {/* Thin left colored border */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", priorityBorderColor)}></div>
        
        <div className="flex items-center justify-between">
          {/* LEFT SIDE: Task info */}
          <div className="flex-1 pr-4">
            {/* Badges row - all muted for overflow */}
            <div className="flex items-center gap-3 mb-1">
              <PriorityBadge priority={task.priority as 1 | 2 | 3 | 4} isOverflow={true} />
              
              {task.context_type && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded">
                  <Tag size={10} />{task.context_type}
                </span>
              )}
              
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded border border-slate-200">
                <Brain size={10} />{task.cognitive_load}/5
              </span>
            </div>
            
            {/* Title */}
            <h4 className="font-medium text-sm text-slate-600 mb-1">{task.title}</h4>
            
            {/* Due date */}
            {task.due_date && (
              <span className="text-[10px] text-slate-400 inline-flex items-center">
                <Calendar size={10} className="mr-1" />Due: {task.due_date}
              </span>
            )}
          </div>
          
          {/* RIGHT SIDE: Time & menu */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              {task.estimate_min} min
            </span>
            <button className="w-6 h-6 text-slate-300 flex items-center justify-center cursor-not-allowed">
              <DotsThreeVertical size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Compact layout for remaining tasks (queue)
  if (isCompact) {
    return (
      <div 
        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden"
        onClick={() => onOpenDetails(task.id)}
      >
        {/* Thin left colored border */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", priorityBorderColor)}></div>
        
        <div className="flex items-center justify-between">
          {/* LEFT SIDE: Task info */}
          <div className="flex-1 pr-4">
            {/* Badges row */}
            <div className="flex items-center gap-3 mb-1">
              <PriorityBadge priority={task.priority as 1 | 2 | 3 | 4} />
              
              {task.context_type && (
                <ContextBadge 
                  context={task.context_type} 
                  aiInferred={task.metadata?.ai_inferred_context || false}
                />
              )}
              
              <CognitiveLoadBadge load={task.cognitive_load} />
            </div>
            
            {/* Title */}
            <h4 className="font-medium text-sm text-slate-800 group-hover:text-indigo-600 transition-colors mb-1">
              {task.title}
            </h4>
            
            {/* Due date */}
            <DeadlineBadge dueDate={task.due_date || null} todayDate={todayDate} />
          </div>
          
          {/* RIGHT SIDE: Time & menu (NO play button) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
              {task.estimate_min} min
            </span>
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
        </div>
      </div>
    )
  }

  // Full-size layout for Top 3 tasks
  return (
    <div 
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden"
      onClick={() => onOpenDetails(task.id)}
    >
      {/* Thin left colored border */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", priorityBorderColor)}></div>
      
      <div className="flex items-start justify-between">
        {/* LEFT SIDE: Task info */}
        <div className="flex-1 pr-4">
          {/* Badges row */}
          <div className="flex items-center gap-3 mb-2">
            {task.is_must && <MustBadge />}
            
            <PriorityBadge priority={task.priority as 1 | 2 | 3 | 4} />
            
            {task.context_type && (
              <ContextBadge 
                context={task.context_type} 
                aiInferred={task.metadata?.ai_inferred_context || false}
              />
            )}
            
            <CognitiveLoadBadge load={task.cognitive_load} />
          </div>
          
          {/* Title */}
          <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
            {task.title}
          </h4>
          
          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
              {task.description}
            </p>
          )}
          
          {/* Due date */}
          <DeadlineBadge dueDate={task.due_date || null} todayDate={todayDate} />
        </div>
        
        {/* RIGHT SIDE: Time & Actions */}
        <div className="flex flex-col items-end justify-between h-full gap-4">
          {/* Top: time estimate & menu */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
              {task.estimate_min} min
            </span>
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
          
          {/* Bottom: play button (hidden, shows on hover) */}
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onStartTimer(task.id)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center"
          >
            <Play size={12} weight="fill" />
          </button>
        </div>
      </div>
      
      {/* Postpone alert */}
      {task.postpone_count >= POSTPONE_ALERT_THRESHOLD && (
        <div className="mt-3">
          <PostponeAlertBanner postponeCount={task.postpone_count} />
        </div>
      )}
      
      {/* Score tooltip */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <DayAssistantV2TaskTooltip task={task} queuePosition={queuePosition} />
      </div>
    </div>
  )
}
