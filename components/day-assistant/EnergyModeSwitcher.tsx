'use client'

import { EnergyMode, ENERGY_MODE_EMOJI, ENERGY_MODE_CONSTRAINTS } from '@/lib/types/dayAssistant'
import { cn } from '@/lib/utils'

interface EnergyModeSwitcherProps {
  currentMode: EnergyMode
  onChange: (mode: EnergyMode) => void
}

/**
 * Energy Mode Switcher Component (🔴🟡🟢)
 * 
 * Manual switcher for user to change their energy mode
 */
export function EnergyModeSwitcher({ currentMode, onChange }: EnergyModeSwitcherProps) {
  const modes: EnergyMode[] = ['crisis', 'normal', 'flow']

  const modeStyles = {
    crisis: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
    normal: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200',
    flow: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
  }

  const activeStyles = {
    crisis: 'bg-red-500 text-white border-red-600',
    normal: 'bg-yellow-500 text-white border-yellow-600',
    flow: 'bg-green-500 text-white border-green-600'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground mr-2">Tryb energii:</span>
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        {modes.map((mode) => {
          const isActive = currentMode === mode
          const constraints = ENERGY_MODE_CONSTRAINTS[mode]

          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className={cn(
                'px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm',
                'focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2',
                isActive ? activeStyles[mode] : modeStyles[mode]
              )}
              title={constraints.description}
            >
              <span className="text-lg mr-1">{ENERGY_MODE_EMOJI[mode]}</span>
              {mode === 'crisis' && 'Zjazd'}
              {mode === 'normal' && 'Normalnie'}
              {mode === 'flow' && 'Flow'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
