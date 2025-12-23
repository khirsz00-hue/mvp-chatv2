/**
 * EnergyFocusControls Component
 * 3-level button toggles for energy and focus
 */

'use client'

import Button from '@/components/ui/Button'
import { Coffee } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface EnergyFocusControlsProps {
  energy: number
  focus: number
  onEnergyChange: (value: number) => void
  onFocusChange: (value: number) => void
  onAddBreak?: () => void
  isUpdating?: boolean
}

type EnergyLevel = 1 | 3 | 5

const ENERGY_LEVELS: { value: EnergyLevel; label: string; emoji: string }[] = [
  { value: 1, label: 'Niska', emoji: '🔴' },
  { value: 3, label: 'Normalna', emoji: '🟡' },
  { value: 5, label: 'Wysoka', emoji: '🟢' }
]

const FOCUS_LEVELS: { value: EnergyLevel; label: string; emoji: string }[] = [
  { value: 1, label: 'Niskie', emoji: '🔴' },
  { value: 3, label: 'Normalne', emoji: '🟡' },
  { value: 5, label: 'Wysokie', emoji: '🟢' }
]

export function EnergyFocusControls({
  energy,
  focus,
  onEnergyChange,
  onFocusChange,
  onAddBreak,
  isUpdating = false
}: EnergyFocusControlsProps) {
  return (
    <div className="space-y-4 relative">
      {isUpdating && (
        <div className="absolute -top-1 -right-1 flex items-center gap-1 text-xs text-brand-purple">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-purple" />
          <span>Aktualizuję...</span>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ⚡ Energia
        </label>
        <div className="flex gap-2">
          {ENERGY_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => onEnergyChange(level.value)}
              disabled={isUpdating}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all',
                energy === level.value
                  ? 'bg-brand-purple text-white border-brand-purple'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-brand-purple',
                isUpdating && 'opacity-60 cursor-not-allowed'
              )}
            >
              {level.emoji} {level.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🎯 Skupienie
        </label>
        <div className="flex gap-2">
          {FOCUS_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => onFocusChange(level.value)}
              disabled={isUpdating}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all',
                focus === level.value
                  ? 'bg-brand-purple text-white border-brand-purple'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-brand-purple',
                isUpdating && 'opacity-60 cursor-not-allowed'
              )}
            >
              {level.emoji} {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Break Button */}
      {onAddBreak && (
        <div className="pt-2">
          <Button
            onClick={onAddBreak}
            variant="outline"
            className="w-full gap-2 border-green-300 hover:bg-green-50"
          >
            <Coffee size={20} />
            Dodaj przerwę
          </Button>
        </div>
      )}
    </div>
  )
}
