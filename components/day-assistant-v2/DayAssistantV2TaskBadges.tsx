/**
 * DayAssistantV2TaskBadges - Reusable badge components for task cards
 * Part of Day Assistant V2 Complete Overhaul
 */

import Badge from '@/components/ui/Badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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

// Priority Badge - P1 (orange), P2 (blue), P3 (violet), P4 (gray)
export function PriorityBadge({ priority, isOverflow = false }: { priority: 1 | 2 | 3 | 4, isOverflow?: boolean }) {
  if (isOverflow) {
    // All overflow badges are muted slate
    const label = priority === 4 ? 'P1' : priority === 3 ? 'P2' : priority === 2 ? 'P3' : 'P4'
    return (
      <Badge className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
        {label}
      </Badge>
    )
  }
  
  const variants = {
    4: { className: 'px-2 py-0.5 bg-orange-50 text-orange-600 border-orange-100 text-[10px] font-bold uppercase tracking-wider', label: 'P1' },
    3: { className: 'px-2 py-0.5 bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold uppercase tracking-wider', label: 'P2' },
    2: { className: 'px-2 py-0.5 bg-violet-50 text-violet-600 border-violet-100 text-[10px] font-bold uppercase tracking-wider', label: 'P3' },
    1: { className: 'px-2 py-0.5 bg-slate-50 text-slate-600 border-slate-100 text-[10px] font-bold uppercase tracking-wider', label: 'P4' }
  }
  
  const config = variants[priority] || variants[1]
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
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
      <span className="text-[10px] text-red-600">
        <i className="fa-regular fa-calendar mr-1"></i>Przeterminowane
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
        <span className="text-[10px] text-slate-400">
          <i className="fa-regular fa-calendar mr-1"></i>Due: Today {hours}:{minutes}
        </span>
      )
    }
    return (
      <span className="text-[10px] text-slate-400">
        <i className="fa-regular fa-calendar mr-1"></i>Due: Today
      </span>
    )
  }
  
  // Due tomorrow
  if (diffDays === 1) {
    return (
      <span className="text-[10px] text-slate-400">
        <i className="fa-regular fa-calendar mr-1"></i>Due: Tomorrow
      </span>
    )
  }
  
  // Due in future
  return (
    <span className="text-[10px] text-slate-400">
      <i className="fa-regular fa-calendar mr-1"></i>Due: {diffDays}d
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
    if (load <= 2) return 'px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold'
    if (load <= 4) return 'px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold'
    return 'px-2 py-0.5 bg-red-50 text-red-700 border-red-200 text-[10px] font-bold'
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Badge className={cn(getLoadColor(load), 'rounded')}>
            <i className="fa-solid fa-brain mr-1"></i>{load}/5
          </Badge>
        </div>
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
        <div>
          <Badge className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded border border-slate-100">
            <i className="fa-solid fa-tag mr-1"></i>{context} {aiInferred && '✨'}
          </Badge>
        </div>
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
