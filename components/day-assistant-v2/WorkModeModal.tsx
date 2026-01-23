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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] md:max-h-[90vh] overflow-auto animate-slide-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 md:p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-2xl font-bold">Wybierz tryb pracy</h2>
            <p className="text-purple-100 text-xs md:text-sm mt-1">
              Zmiana trybu wpłynie na kolejność i filtrowanie zadań
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Zamknij"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Modes */}
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          {Object.entries(WORK_MODE_OPTIONS).map(([key, mode]) => {
            const isActive = key === currentMode
            return (
              <button
                key={key}
                onClick={() => onSelect(key as WorkMode)}
                className={`
                  w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all min-h-[44px]
                  ${isActive 
                    ? 'border-purple-500 bg-purple-50 shadow-lg scale-[1.02]' 
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 truncate">
                      {mode.name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-0.5">{mode.description}</p>
                  </div>
                  {isActive && (
                    <span className="px-2 md:px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full flex-shrink-0 ml-2">
                      Aktywny
                    </span>
                  )}
                </div>

                <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3">{mode.details}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg">
                    <span className="font-semibold text-blue-900">Kiedy:</span>
                    <p className="text-blue-700 mt-0.5 md:mt-1">{mode.when}</p>
                  </div>
                  <div className="bg-purple-50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg">
                    <span className="font-semibold text-purple-900">Filtruje:</span>
                    <p className="text-purple-700 mt-0.5 md:mt-1">{mode.filters}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-3 md:p-4 rounded-b-2xl border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full min-h-[44px]"
          >
            Anuluj
          </Button>
        </div>
      </div>
    </div>
  )
}
