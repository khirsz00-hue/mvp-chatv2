/**
 * DayAssistantV2TaskBadges - Reusable badge components for task cards
 * Part of Day Assistant V2 Complete Overhaul
 */

import Badge from '@/components/ui/Badge'
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

// Priority Badge - P1 (red), P2 (orange), P3 (blue), P4 (gray)
// Todoist priority scale:
// priority=4 → P1 (highest)
// priority=3 → P2
// priority=2 → P3
// priority=1 → P4 (lowest)
export function PriorityBadge({ priority }: { priority: 1 | 2 | 3 | 4 }) {
  const variants = {
    4: { className: 'bg-red-100 text-red-800 border-red-300', label: 'P1' },
    3: { className: 'bg-orange-100 text-orange-800 border-orange-300', label: 'P2' },
    2: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'P3' },
    1: { className: 'bg-gray-100 text-gray-600 border-gray-300', label: 'P4' }
  }
  
  const config = variants[priority] || variants[1]
  
  return (
    <Badge className={config.className}>
      🚩 {config.label}
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
      <Badge className="bg-red-600 text-white border-red-700 font-bold">
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
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">
          ⏰ Dziś {hours}:{minutes}
        </Badge>
      )
    }
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">
        ⏰ Dziś
      </Badge>
    )
  }
  
  // Due tomorrow
  if (diffDays === 1) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
        📅 Jutro
      </Badge>
    )
  }
  
  // Due in 2-7 days
  if (diffDays <= 7) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
        📅 Za {diffDays}d
      </Badge>
    )
  }
  
  // Future (> 7 days)
  return (
    <Badge variant="outline" className="text-gray-600">
      📅 Za {diffDays}d
    </Badge>
  )
}

// Cognitive Load Badge - Shows brain icon with load level (1-5)
export function CognitiveLoadBadge({ load }: { load: number }) {
  const getLoadColor = (load: number): string => {
    if (load <= 2) return 'bg-green-100 text-green-800 border-green-300'
    if (load === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }
  
  return (
    <Badge className={getLoadColor(load)}>
      🧠 {load}/5
    </Badge>
  )
}

// Duration Badge - Shows estimated time
export function DurationBadge({ minutes }: { minutes: number }) {
  const formatDuration = (mins: number): string => {
    if (mins < 60) {
      return `${mins}m`
    }
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    if (remainingMins === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMins}m`
  }
  
  return (
    <Badge className="bg-purple-100 text-purple-800 border-purple-300">
      ⏱ {formatDuration(minutes)}
    </Badge>
  )
}

// Context Badge - Shows project/context with AI indicator
export function ContextBadge({ context, aiInferred }: { context: string, aiInferred: boolean }) {
  if (!context) return null
  
  return (
    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
      📁 {context} {aiInferred && '✨'}
    </Badge>
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
