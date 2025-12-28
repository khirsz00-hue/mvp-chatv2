/**
 * DayAssistantV2WorkModeSelector - Three work mode buttons
 * Part of Day Assistant V2 Complete Overhaul
 */

'use client'

import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'

export type WorkMode = 'low_focus' | 'standard' | 'hyperfocus'

interface DayAssistantV2WorkModeSelectorProps {
  currentMode: WorkMode
  onChange: (mode: WorkMode) => void
}

export function DayAssistantV2WorkModeSelector({ currentMode, onChange }: DayAssistantV2WorkModeSelectorProps) {
  const modes = [
    {
      id: 'low_focus' as WorkMode,
      emoji: '🔴',
      label: 'Low Focus',
      description: 'Łatwe zadania (cognitive < 3)'
    },
    {
      id: 'standard' as WorkMode,
      emoji: '🟡',
      label: 'Standard',
      description: 'Wszystkie zadania, priorytet deadline'
    },
    {
      id: 'hyperfocus' as WorkMode,
      emoji: '⚡',
      label: 'HyperFocus',
      description: 'Trudne zadania (cognitive > 3)'
    }
  ]

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-700">🎯 Tryb pracy:</h3>
      
      {/* Desktop: horizontal buttons */}
      <div className="hidden md:flex gap-2">
        {modes.map((mode) => (
          <Button
            key={mode.id}
            size="sm"
            variant={currentMode === mode.id ? 'default' : 'outline'}
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex-1 transition-all",
              currentMode === mode.id && "border-2 border-purple-600 bg-purple-50 text-purple-900 font-bold"
            )}
            title={mode.description}
          >
            <span className="mr-1">{mode.emoji}</span>
            {mode.label}
          </Button>
        ))}
      </div>

      {/* Mobile: vertical buttons */}
      <div className="flex flex-col gap-2 md:hidden">
        {modes.map((mode) => (
          <Button
            key={mode.id}
            size="sm"
            variant={currentMode === mode.id ? 'default' : 'outline'}
            onClick={() => onChange(mode.id)}
            className={cn(
              "w-full justify-start transition-all",
              currentMode === mode.id && "border-2 border-purple-600 bg-purple-50 text-purple-900 font-bold"
            )}
          >
            <div className="flex flex-col items-start">
              <div>
                <span className="mr-1">{mode.emoji}</span>
                <span className="font-semibold">{mode.label}</span>
              </div>
              <div className="text-xs text-gray-600 font-normal">
                {mode.description}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
