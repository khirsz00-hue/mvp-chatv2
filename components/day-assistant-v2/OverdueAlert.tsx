/**
 * OverdueAlert Component
 * Light pink banner alert for overdue tasks (according to mockup)
 * Shows below the top bar when overdue tasks are detected
 */

'use client'

import { Warning } from '@phosphor-icons/react'

export interface OverdueAlertProps {
  overdueCount: number
  onReview: () => void
}

export function OverdueAlert({ overdueCount, onReview }: OverdueAlertProps) {
  if (overdueCount === 0) return null

  return (
    <div className="px-6 mb-6">
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
        
        {/* Left side: Icon + Text */}
        <div className="flex items-center gap-3">
          {/* Icon in circle */}
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 flex-shrink-0">
            <Warning size={20} weight="fill" />
          </div>
          
          {/* Text */}
          <div>
            <h3 className="text-sm font-bold text-red-700">
              {overdueCount} Overdue Task{overdueCount > 1 ? 's' : ''} detected
            </h3>
            <p className="text-xs text-red-600/80 mt-0.5">
              These tasks were moved from yesterday. Review them?
            </p>
          </div>
        </div>
        
        {/* Right side: Button */}
        <button 
          onClick={onReview}
          className="text-xs font-semibold bg-white text-red-600 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          Review
        </button>
      </div>
    </div>
  )
}
