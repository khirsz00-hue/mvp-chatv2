/**
 * TopStatusBar Component
 * Full-width status bar showing all key metrics and current work status
 */

'use client'

import { WorkMode } from './WorkModeSelector'
import { StreakDisplay } from '@/components/gamification/StreakDisplay'
import { TimeStatsCompact } from '@/components/gamification/TimeStatsCompact'

export interface TopStatusBarProps {
  // Zadania
  completedToday: number
  totalToday: number
  
  // Czas
  usedMinutes: number
  availableMinutes: number
  usagePercentage: number
  
  // Tryb pracy
  workMode: WorkMode
  
  // Aktualny status
  activeTimer?: {
    taskId: string
    taskTitle: string
    elapsedSeconds: number
    estimatedMinutes: number
  }
  firstInQueue?: {
    title: string
  }
}

const WORK_MODE_LABELS = {
  low_focus: '🔴 Low Focus',
  standard: '🟡 Standard',
  hyperfocus: '⚡ HyperFocus',
  quick_wins: '⏱️ Quick Wins'
}

export function TopStatusBar({
  completedToday,
  totalToday,
  usedMinutes,
  availableMinutes,
  usagePercentage,
  workMode,
  activeTimer,
  firstInQueue
}: TopStatusBarProps) {
  return (
    <div 
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 mb-6 shadow-md"
      role="complementary"
      aria-label="Status pracy i metryki"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left side: Metrics */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Streak */}
          <StreakDisplay />
          
          {/* Zadania dzisiaj */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-sm font-bold text-green-800">
                {completedToday}/{totalToday} zadań
              </p>
              <p className="text-xs text-green-600">Dzisiaj</p>
            </div>
          </div>
          
          {/* Czas */}
          {availableMinutes > 0 && (
            <TimeStatsCompact
              usedMinutes={usedMinutes}
              availableMinutes={availableMinutes}
              usagePercentage={usagePercentage}
            />
          )}
          
          {/* Tryb pracy */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-bold text-indigo-800">
                {WORK_MODE_LABELS[workMode]}
              </p>
              <p className="text-xs text-indigo-600">Tryb pracy</p>
            </div>
          </div>
        </div>
        
        {/* Right side: Current status */}
        <div className="flex-1 min-w-[200px]" aria-live="polite" aria-atomic="true">
          {activeTimer ? (
            // When timer is active
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-300">
              <span className="text-xl">▶️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-600 font-semibold">Pracujesz nad:</p>
                <p className="text-sm font-bold text-purple-900 truncate" title={activeTimer.taskTitle}>
                  {activeTimer.taskTitle}
                </p>
              </div>
            </div>
          ) : firstInQueue ? (
            // When timer is off - show first in queue
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg border border-blue-300">
              <span className="text-xl">👉</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600 font-semibold">Pierwsze w kolejce:</p>
                <p className="text-sm font-bold text-blue-900 truncate" title={firstInQueue.title}>
                  {firstInQueue.title}
                </p>
              </div>
            </div>
          ) : (
            // No tasks
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-slate-100 rounded-lg border border-gray-300">
              <span className="text-xl">✨</span>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-semibold">Status:</p>
                <p className="text-sm font-bold text-gray-900">Brak zadań</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
