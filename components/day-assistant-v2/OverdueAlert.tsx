/**
 * OverdueAlert Component
 * Red banner alert for overdue tasks
 * Shows below the top bar when overdue tasks are detected
 */

'use client'

import Button from '@/components/ui/Button'
import { Warning } from '@phosphor-icons/react'

export interface OverdueAlertProps {
  overdueCount: number
  onReview: () => void
}

export function OverdueAlert({ overdueCount, onReview }: OverdueAlertProps) {
  if (overdueCount === 0) return null

  return (
    <div className="w-full bg-red-600 border-b-2 border-red-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <Warning size={20} weight="fill" className="text-white flex-shrink-0" />
            <p className="text-white font-semibold text-xs sm:text-base">
              🔴 {overdueCount} {overdueCount === 1 ? 'Przeterminowane zadanie' : 'Przeterminowane zadania'} wykryte. 
              <span className="hidden sm:inline"> Przejrzeć?</span>
            </p>
          </div>
          
          <Button
            onClick={onReview}
            size="sm"
            className="bg-white text-red-600 hover:bg-gray-100 font-semibold text-xs sm:text-sm"
          >
            Przejrzyj
          </Button>
        </div>
      </div>
    </div>
  )
}
