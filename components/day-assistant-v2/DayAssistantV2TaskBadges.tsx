/**
 * DayAssistantV2TaskBadges - Reusable badge components for task cards
 * Part of Day Assistant V2 Complete Overhaul
 */

import Badge from '@/components/ui/Badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Tag, Brain, Calendar } from '@phosphor-icons/react'

// Position Badge - Shows queue position (#1, #2, etc.)
export function PositionBadge({ position }: { position: number }) {
  return (
    <Badge className="bg-purple-600 text-white border-purple-700 font-bold">
      #{position}
    </Badge>
  )
}

// MUST Badge - Red badge with pin icon
export function MustBadge() {
  return (
    <Badge className="bg-red-600 text-white border-red-700 font-bold">
      📌 MUST
    </Badge>
  )
}

// Priority Badge - P1 (red), P2 (orange), P3 (blue), P4 (gray)
export function PriorityBadge({ priority, isOverflow = false }: { priority: 1 | 2 | 3 | 4, isOverflow?: boolean }) {
  if (isOverflow) {
    // All overflow badges are muted slate
    const label = priority === 1 ? 'P1' : priority === 2 ? 'P2' : priority === 3 ? 'P3' : 'P4'
    return (
      <span className="text-slate-500 text-sm font-bold">
        {label}
      </span>
    )
  }
  
  const variants = {
    1: { className: 'text-red-600 text-sm font-bold', label: 'P1' },     // Highest priority - red
    2: { className: 'text-orange-600 text-sm font-bold', label: 'P2' },  // High priority - orange
    3: { className: 'text-blue-600 text-sm font-bold', label: 'P3' },    // Medium priority - blue
    4: { className: 'text-slate-500 text-sm font-bold', label: 'P4' }    // Low priority - gray
  }
  
  const config = variants[priority] || variants[4]
  
  return (
    <span className={config.className}>
      {config.label}
    </span>
  )
}

// Deadline Badge - Shows due date with appropriate styling
export function DeadlineBadge({ dueDate, todayDate }: { dueDate: string | null, todayDate: string }) {
  if (!dueDate) return null
  
  const today = new Date(todayDate)
  const due = new Date(dueDate)
  const diffMs = due.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // Overdue
  if (diffDays < 0) {
    return (
      <span className="text-[10px] text-red-600 inline-flex items-center">
        <Calendar size={10} className="mr-1" />Przeterminowane
      </span>
    )
  }
  
  // Due today
  if (diffDays === 0) {
    // Check if there's a time component
    const timeMatch = dueDate.match(/T(\d{2}):(\d{2})/)
    if (timeMatch) {
      const hours = timeMatch[1]
      const minutes = timeMatch[2]
      return (
        <span className="text-[10px] text-slate-400 inline-flex items-center">
          <Calendar size={10} className="mr-1" />Due: Today {hours}:{minutes}
        </span>
      )
    }
    return (
      <span className="text-[10px] text-slate-400 inline-flex items-center">
        <Calendar size={10} className="mr-1" />Due: Today
      </span>
    )
  }
  
  // Due tomorrow
  if (diffDays === 1) {
    return (
      <span className="text-[10px] text-slate-400 inline-flex items-center">
        <Calendar size={10} className="mr-1" />Due: Tomorrow
      </span>
    )
  }
  
  // Due in future
  return (
    <span className="text-[10px] text-slate-400 inline-flex items-center">
      <Calendar size={10} className="mr-1" />Due: {diffDays}d
    </span>
  )
}

// Cognitive Load Badge - Shows brain icon with load level (1-5)
export function CognitiveLoadBadge({ load }: { load: number }) {
  const getLoadDescription = (load: number): string => {
    if (load === 1) return 'Bardzo proste zadanie - szybkie do wykonania'
    if (load === 2) return 'Proste zadanie - niewielki wysiłek mentalny'
    if (load === 3) return 'Średnia złożoność - wymaga skupienia'
    if (load === 4) return 'Złożone zadanie - wymaga wysokiej koncentracji'
    if (load === 5) return 'Bardzo złożone - pełne zaangażowanie mentalne'
    return 'Nieznana złożoność'
  }
  
  const getLoadColor = (load: number): string => {
    if (load <= 2) return 'inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-200'
    if (load <= 4) return 'inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded border border-orange-200'
    return 'inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-200'
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={getLoadColor(load)}>
          <Brain size={10} />{load}/5
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          {getLoadDescription(load)}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Duration Badge - Shows estimated time
export function DurationBadge({ minutes }: { minutes: number }) {
  const formatDuration = (mins: number): string => {
    if (mins < 60) {
      return `${mins} min`
    }
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    if (remainingMins === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMins}m`
  }
  
  return (
    <Badge className="bg-slate-50 text-slate-600 border-slate-100 text-xs font-semibold">
      {formatDuration(minutes)}
    </Badge>
  )
}

// Context Badge - Shows project/context with AI indicator
export function ContextBadge({ context, aiInferred }: { context: string, aiInferred: boolean }) {
  if (!context) return null
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">
          <Tag size={10} />{context} {aiInferred && '✨'}
        </span>
      </TooltipTrigger>
      {aiInferred && (
        <TooltipContent>
          <div className="text-xs">
            Kontekst ustalony przez AI
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}

// Postpone Alert Banner - Shows warning when task has been postponed 3+ times
export function PostponeAlertBanner({ postponeCount }: { postponeCount: number }) {
  if (postponeCount < 3) return null
  
  return (
    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded-md">
      <p className="text-xs text-yellow-800 flex items-center gap-1">
        <span>⚠️</span>
        <span>Odkładane już {postponeCount}x - może warto podzielić?</span>
      </p>
    </div>
  )
}
