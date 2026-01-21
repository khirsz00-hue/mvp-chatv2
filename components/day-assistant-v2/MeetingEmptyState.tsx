/**
 * MeetingEmptyState Component
 * 
 * Displays a beautiful empty state when user has no meetings scheduled for the day.
 * Features:
 * - Gradient blue-to-indigo background
 * - Coffee mug icon in a circular container
 * - "Deep Work" badge
 * - Link to Google Calendar
 */

'use client'

import { Coffee, Brain, ArrowSquareOut } from '@phosphor-icons/react'

export function MeetingEmptyState() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        {/* Coffee mug icon in circle */}
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md">
          <Coffee size={48} weight="fill" className="text-indigo-400" />
        </div>
        
        {/* Main message */}
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-2">
            Dzień bez spotkań! ☕
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Idealny czas na skupioną pracę nad taskiami
          </p>
        </div>
        
        {/* Deep Work badge */}
        <div className="inline-flex items-center gap-2 text-xs text-indigo-600 bg-white px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm">
          <Brain size={16} weight="fill" />
          <span className="font-semibold">Tryb Deep Work dostępny</span>
        </div>
        
        {/* Link to Google Calendar */}
        <button 
          onClick={() => window.open('https://calendar.google.com', '_blank')}
          className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 transition-colors"
        >
          <ArrowSquareOut size={14} weight="bold" />
          Zobacz pełny kalendarz
        </button>
      </div>
    </div>
  )
}
