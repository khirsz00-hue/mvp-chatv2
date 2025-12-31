'use client'

import { X } from '@phosphor-icons/react'
import { WorkMode } from './WorkModeSelector'
import Button from '@/components/ui/Button'

interface WorkModeModalProps {
  isOpen: boolean
  onClose: () => void
  currentMode: WorkMode
  onSelect: (mode: WorkMode) => void
}

const WORK_MODE_OPTIONS = {
  standard: {
    name: '🎯 Standard',
    description: 'Normalny dzień pracy',
    details: 'Zrównoważone podejście - wszystkie typy zadań, priorytet według ważności i deadline\'ów. Najlepszy dla regularnego dnia pracy.',
    when: 'Normalna energia, standardowy dzień',
    filters: 'Wszystkie zadania'
  },
  low_focus: {
    name: '🧘 Low Focus',
    description: 'Zmęczenie lub rozproszenie',
    details: 'Tylko proste, lekkie zadania (cognitive load ≤ 2). Idealne na dni ze spadkiem energii lub gdy potrzebujesz łatwych wygranych.',
    when: 'Niska energia, rozproszenie, potrzebujesz małych sukcesów',
    filters: 'Zadania cognitive load ≤ 2'
  },
  quick_wins: {
    name: '⚡ Quick Wins',
    description: 'Krótkie zadania (momentum)',
    details: 'Zadania do 20 minut. Buduj momentum przez serię szybkich wygranych. Świetne na start dnia lub między spotkaniami.',
    when: 'Krótkie okna czasowe, budowanie momentum',
    filters: 'Zadania < 20 min'
  },
  hyperfocus: {
    name: '🔥 HyperFocus',
    description: 'Wysoka energia i koncentracja',
    details: 'Tylko trudne, wymagające zadania (cognitive load ≥ 4). Wykorzystaj szczytową produktywność na najbardziej wymagające wyzwania.',
    when: 'Szczytowa energia, długi blok czasu, chęć do trudnych zadań',
    filters: 'Zadania cognitive load ≥ 4'
  },
  crisis: {
    name: '🚨 Crisis Mode',
    description: 'Tylko MUST i deadline dziś',
    details: 'Ekstremalny fokus na najpilniejszych zadaniach. Ignoruje optymalizację - pokazuje tylko to, co MUSI być zrobione dziś.',
    when: 'Przeciążenie, deadline\'y, sytuacja kryzysowa',
    filters: 'Tylko MUST + deadline dziś'
  }
}

export function WorkModeModal({
  isOpen,
  onClose,
  currentMode,
  onSelect
}: WorkModeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-slide-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Wybierz tryb pracy</h2>
            <p className="text-purple-100 text-sm mt-1">
              Zmiana trybu wpłynie na kolejność i filtrowanie zadań
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Modes */}
        <div className="p-6 space-y-4">
          {Object.entries(WORK_MODE_OPTIONS).map(([key, mode]) => {
            const isActive = key === currentMode
            return (
              <button
                key={key}
                onClick={() => onSelect(key as WorkMode)}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all
                  ${isActive 
                    ? 'border-purple-500 bg-purple-50 shadow-lg scale-[1.02]' 
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {mode.name}
                    </h3>
                    <p className="text-sm text-gray-600">{mode.description}</p>
                  </div>
                  {isActive && (
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                      Aktywny
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-3">{mode.details}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 px-3 py-2 rounded-lg">
                    <span className="font-semibold text-blue-900">Kiedy:</span>
                    <p className="text-blue-700 mt-1">{mode.when}</p>
                  </div>
                  <div className="bg-purple-50 px-3 py-2 rounded-lg">
                    <span className="font-semibold text-purple-900">Filtruje:</span>
                    <p className="text-purple-700 mt-1">{mode.filters}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Anuluj
          </Button>
        </div>
      </div>
    </div>
  )
}
