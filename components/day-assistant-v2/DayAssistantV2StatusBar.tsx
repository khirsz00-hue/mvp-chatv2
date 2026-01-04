/**
 * DayAssistantV2StatusBar Component
 * Light status bar that is ALWAYS visible
 * Shows working hours, work mode, and capacity/overload information in 3 sections
 */

'use client'

import { Clock, Target, Warning } from '@phosphor-icons/react'
import { WorkMode } from './WorkModeSelector'

export interface StatusBarProps {
  workHoursStart: string
  workHoursEnd: string
  workMode: WorkMode
  usedMinutes: number
  totalCapacity: number
  onEditWorkHours?: () => void
  onEditMode?: () => void
}

const MODE_LABELS: Record<WorkMode, string> = {
  low_focus: 'Low Focus',
  standard: 'Standard',
  hyperfocus: 'Focus',
  quick_wins: 'Quick Wins'
}

export function DayAssistantV2StatusBar({
  workHoursStart,
  workHoursEnd,
  workMode,
  usedMinutes,
  totalCapacity,
  onEditWorkHours,
  onEditMode
}: StatusBarProps) {
  const remainingMinutes = totalCapacity - usedMinutes
  const overloadPercent = totalCapacity > 0 ? Math.round((usedMinutes / totalCapacity) * 100) : 0
  const isOverloaded = overloadPercent > 80

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between gap-6">
        
        {/* WORKING HOURS */}
        <div 
          className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 px-3 py-2 rounded-lg transition-all"
          onClick={onEditWorkHours}
          role="button"
          tabIndex={0}
        >
          <Clock size={16} className="text-slate-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
              Working Hours
            </p>
            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              {workHoursStart} - {workHoursEnd}
            </p>
          </div>
          <i className="fa-solid fa-pen text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Separator */}
        <div className="h-10 w-px bg-slate-200" />

        {/* MODE */}
        <div 
          className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 px-3 py-2 rounded-lg transition-all"
          onClick={onEditMode}
          role="button"
          tabIndex={0}
        >
          <Target size={16} className="text-indigo-500" weight="fill" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
              Mode
            </p>
            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              {MODE_LABELS[workMode]}
            </p>
          </div>
          <i className="fa-solid fa-chevron-down text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Separator */}
        <div className="h-10 w-px bg-slate-200" />

        {/* DAY OVERLOAD */}
        <div className="flex-1 flex items-center gap-3">
          {isOverloaded && <Warning size={16} className="text-amber-500" weight="fill" />}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                Day Overload
              </p>
              <p className={`text-xs font-bold ${isOverloaded ? 'text-amber-600' : 'text-slate-600'}`}>
                {usedMinutes} min / {remainingMinutes} min left
              </p>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  isOverloaded 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500' 
                    : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                }`}
                style={{ width: `${Math.min(overloadPercent, 100)}%` }}
              />
            </div>
          </div>
          <span className={`text-lg font-bold ml-2 ${isOverloaded ? 'text-amber-600' : 'text-slate-600'}`}>
            {overloadPercent}%
          </span>
        </div>
      </div>
    </div>
  )
}
