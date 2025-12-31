'use client'

import { Card } from '@/components/ui/Card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type WorkMode = 'low_focus' | 'standard' | 'hyperfocus' | 'quick_wins' | 'crisis'

interface Props {
  value: WorkMode
  onChange: (mode: WorkMode) => void
  isUpdating?: boolean
}

export function WorkModeSelector({ value, onChange, isUpdating }: Props) {
  const modes = [
    {
      id: 'low_focus' as WorkMode,
      emoji: '🧘',
      label: 'Low Focus',
      description: 'Pokazuj tylko łatwe zadania (cognitive load ≤ 2). Idealne gdy jesteś zmęczony.'
    },
    {
      id: 'standard' as WorkMode,
      emoji: '🎯',
      label: 'Standard',
      description: 'Normalne sortowanie według priorytetu i dopasowania. Standardowy tryb pracy.'
    },
    {
      id: 'quick_wins' as WorkMode,
      emoji: '⚡',
      label: 'Quick Wins',
      description: 'Błyskawiczne zadania z est. czasem < 20 min — złap szybkie wygrane.'
    },
    {
      id: 'hyperfocus' as WorkMode,
      emoji: '🔥',
      label: 'HyperFocus',
      description: 'Tylko trudne zadania (cognitive load ≥ 4). Wykorzystaj wysoki focus!'
    },
    {
      id: 'crisis' as WorkMode,
      emoji: '🚨',
      label: 'Crisis Mode',
      description: 'Tylko MUST i deadline dziś. Ekstremalny fokus na najpilniejszych zadaniach.'
    }
  ]

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">🎯 Wybierz tryb pracy:</h3>
      
      <RadioGroup value={value} onValueChange={(v) => onChange(v as WorkMode)}>
        {/* Desktop: vertical stack */}
        <div className="hidden md:flex md:flex-col space-y-3">
          {modes.map((mode) => (
            <div key={mode.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
              <RadioGroupItem value={mode.id} id={mode.id} disabled={isUpdating} />
              <div className="flex-1">
                <Label htmlFor={mode.id} className="cursor-pointer font-medium">
                  {mode.emoji} {mode.label}
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  {mode.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: horizontal carousel */}
        <div className="md:hidden overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2 snap-x snap-mandatory">
            {modes.map((mode) => (
              <div
                key={mode.id}
                className={cn(
                  "flex-shrink-0 w-[85vw] max-w-[320px] snap-center p-4 rounded-lg border transition-all cursor-pointer",
                  value === mode.id 
                    ? "border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => !isUpdating && onChange(mode.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <RadioGroupItem value={mode.id} id={`mobile-${mode.id}`} disabled={isUpdating} />
                  <Label htmlFor={`mobile-${mode.id}`} className="cursor-pointer font-medium text-base">
                    {mode.emoji} {mode.label}
                  </Label>
                </div>
                <p className="text-sm text-gray-500 leading-tight">
                  {mode.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </RadioGroup>

      {isUpdating && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          Przebudowuję kolejkę...
        </div>
      )}
    </Card>
  )
}

// Export icons and labels for use in other components
export const MODE_ICONS: Record<WorkMode, string> = {
  standard: '🎯',
  low_focus: '🧘',
  quick_wins: '⚡',
  hyperfocus: '🔥',
  crisis: '🚨'
}

export const MODE_LABELS: Record<WorkMode, string> = {
  standard: 'Standard',
  low_focus: 'Low Focus',
  quick_wins: 'Quick Wins',
  hyperfocus: 'HyperFocus',
  crisis: 'Crisis Mode'
}
