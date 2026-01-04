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
export function PriorityBadge({ priority }: { priority: 1 | 2 | 3 | 4 }) {
  const variants = {
    4: { className: 'bg-orange-50 text-orange-600 border-orange-100 text-[10px] font-bold uppercase tracking-wider', label: 'P1' },
    3: { className: 'bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold uppercase tracking-wider', label: 'P2' },
    2: { className: 'bg-violet-50 text-violet-600 border-violet-100 text-[10px] font-bold uppercase tracking-wider', label: 'P3' },
    1: { className: 'bg-slate-50 text-slate-600 border-slate-100 text-[10px] font-bold uppercase tracking-wider', label: 'P4' }
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
      <Badge className="bg-red-50 text-red-600 border-red-100 text-xs font-semibold">
        🔴 Przeterminowane
      </Badge>
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
        <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-xs font-semibold">
          📅 Dziś {hours}:{minutes}
        </Badge>
      )
    }
    return (
      <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-xs font-semibold">
        📅 Dziś
      </Badge>
    )
  }
  
  // Due tomorrow
  if (diffDays === 1) {
    return (
      <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-xs font-semibold">
        📅 Jutro
      </Badge>
    )
  }
  
  // Due in 2-7 days
  if (diffDays <= 7) {
    return (
      <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-xs font-semibold">
        📅 Za {diffDays}d
      </Badge>
    )
  }
  
  // Future (> 7 days)
  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 text-xs">
      📅 Za {diffDays}d
    </Badge>
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
    if (load <= 2) return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    if (load === 3) return 'bg-amber-50 text-amber-600 border-amber-100'
    return 'bg-red-50 text-red-600 border-red-100'
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Badge className={cn(getLoadColor(load), 'text-xs font-semibold')}>
            🧠 {load}/5
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
          <Badge className="bg-slate-50 text-slate-600 border-slate-100 text-xs font-medium">
            📁 {context} {aiInferred && '✨'}
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
