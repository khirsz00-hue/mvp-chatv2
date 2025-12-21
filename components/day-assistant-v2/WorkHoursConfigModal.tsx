/**
 * WorkHoursConfigModal Component
 * Modal for configuring work hours and AI instructions
 */

'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { XCircle } from '@phosphor-icons/react'

interface WorkHoursConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: {
    work_start_time: string
    work_end_time: string
    ai_instructions: string
  }) => void
  initialConfig?: {
    work_start_time?: string
    work_end_time?: string
    ai_instructions?: string
  }
}

export function WorkHoursConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig
}: WorkHoursConfigModalProps) {
  const [workStartTime, setWorkStartTime] = useState(
    initialConfig?.work_start_time || '09:00'
  )
  const [workEndTime, setWorkEndTime] = useState(
    initialConfig?.work_end_time || '17:00'
  )
  const [aiInstructions, setAiInstructions] = useState(
    initialConfig?.ai_instructions || ''
  )

  if (!isOpen) return null

  const handleSave = () => {
    onSave({
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      ai_instructions: aiInstructions
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold">⚙️ Konfiguracja dnia pracy</h2>
          <button onClick={onClose}>
            <XCircle size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🕐 Godziny pracy
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Początek
                </label>
                <input
                  type="time"
                  value={workStartTime}
                  onChange={e => setWorkStartTime(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Koniec
                </label>
                <input
                  type="time"
                  value={workEndTime}
                  onChange={e => setWorkEndTime(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💬 Dodatkowe instrukcje dla AI
            </label>
            <textarea
              value={aiInstructions}
              onChange={e => setAiInstructions(e.target.value)}
              placeholder="Dzisiaj pracuję tylko do 12:00, muszę iść do lekarza"
              className="w-full rounded-lg border px-3 py-2 min-h-[100px] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            ❌ Anuluj
          </Button>
          <Button onClick={handleSave}>
            💾 Zapisz
          </Button>
        </div>
      </div>
    </div>
  )
}
