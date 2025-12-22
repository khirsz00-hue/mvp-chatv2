'use client'

import { Card } from '@/components/ui/Card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export type WorkMode = 'low_focus' | 'focus' | 'quick_wins'

interface Props {
  value: WorkMode
  onChange: (mode: WorkMode) => void
  isUpdating?: boolean
}

export function WorkModeSelector({ value, onChange, isUpdating }: Props) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">🎯 Wybierz tryb pracy:</h3>
      
      <RadioGroup value={value} onValueChange={(v) => onChange(v as WorkMode)}>
        <div className="space-y-3">
          {/* Low Focus Mode */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
            <RadioGroupItem value="low_focus" id="low_focus" disabled={isUpdating} />
            <div className="flex-1">
              <Label htmlFor="low_focus" className="cursor-pointer font-medium">
                🔴 Low Focus
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Pokazuj tylko łatwe zadania (cognitive load ≤ 2). Idealne gdy jesteś zmęczony.
              </p>
            </div>
          </div>

          {/* Focus Mode */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
            <RadioGroupItem value="focus" id="focus" disabled={isUpdating} />
            <div className="flex-1">
              <Label htmlFor="focus" className="cursor-pointer font-medium">
                🟡 Focus
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Normalne sortowanie według priorytetu i dopasowania. Standardowy tryb pracy.
              </p>
            </div>
          </div>

          {/* Quick Wins Mode */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
            <RadioGroupItem value="quick_wins" id="quick_wins" disabled={isUpdating} />
            <div className="flex-1">
              <Label htmlFor="quick_wins" className="cursor-pointer font-medium">
                ⚡ Quick Wins
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Tylko szybkie zadania (≤ 20 min). Zbieraj małe zwycięstwa!
              </p>
            </div>
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
