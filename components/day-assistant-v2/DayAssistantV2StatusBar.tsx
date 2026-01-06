/**
 * DayAssistantV2StatusBar Component
 * Light status bar that is ALWAYS visible
 * Shows working hours, work mode, and capacity/overload information in 3 sections
 */

'use client'

import { Clock, Target, Warning, Pencil, CaretDown } from '@phosphor-icons/react'
import { WorkMode } from './WorkModeSelector'

export interface StatusBarProps {
  workHoursStart: string
  workHoursEnd: string
  workMode: WorkMode
  usedMinutes: number
  totalCapacity: number
  onEditWorkHours?: () => void
  onEditMode?: () => void
  // Project filter props
  selectedProject?: string | null
  projects?: Array<{ id: string; name: string }>
  onProjectChange?: (projectId: string | null) => void
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
  onEditMode,
  selectedProject,
  projects = [],
  onProjectChange
}: StatusBarProps) {
  const remainingMinutes = totalCapacity - usedMinutes
  const overloadPercent = totalCapacity > 0 ? Math.min(Math.round((usedMinutes / totalCapacity) * 100), 100) : 0
  const isOverloaded = overloadPercent > 80

  const handleKeyDown = (e: React.KeyboardEvent, callback?: () => void) => {
    if (callback && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      callback()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-6">
        
        {/* WORKING HOURS */}
        <div 
          className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 px-3 py-2 rounded-lg transition-all flex-shrink-0"
          onClick={onEditWorkHours}
          onKeyDown={(e) => handleKeyDown(e, onEditWorkHours)}
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
          <Pencil size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Separator - hidden on mobile */}
        <div className="hidden lg:block h-10 w-px bg-slate-200" />

        {/* MODE */}
        <div 
          className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 px-3 py-2 rounded-lg transition-all flex-shrink-0"
          onClick={onEditMode}
          onKeyDown={(e) => handleKeyDown(e, onEditMode)}
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
          <CaretDown size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Separator - hidden on mobile */}
        <div className="hidden lg:block h-10 w-px bg-slate-200" />

        {/* KONTEKST (PROJECT FILTER) */}
        {projects.length > 0 && onProjectChange && (
          <>
            <div className="flex flex-col w-full lg:w-auto lg:min-w-[180px] flex-shrink-0">
              <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-1">
                Kontekst
              </label>
              <select
                value={selectedProject || ''}
                onChange={(e) => onProjectChange(e.target.value || null)}
                className="text-sm font-medium bg-transparent border-0 p-0 pr-6 focus:ring-0 focus:outline-none cursor-pointer text-slate-800 hover:text-indigo-600 transition-colors"
              >
                <option value="">Wszystkie projekty</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Separator - hidden on mobile */}
            <div className="hidden lg:block h-10 w-px bg-slate-200" />
          </>
        )}

        {/* DAY OVERLOAD */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {isOverloaded && <Warning size={16} className="text-amber-500 flex-shrink-0" weight="fill" />}
          <div className="flex-1 min-w-0">
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
                style={{ width: `${overloadPercent}%` }}
              />
            </div>
          </div>
          <span className={`text-lg font-bold ml-2 flex-shrink-0 ${isOverloaded ? 'text-amber-600' : 'text-slate-600'}`}>
            {overloadPercent}%
          </span>
        </div>
      </div>
    </div>
  )
}
