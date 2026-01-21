/**
 * MeetingReminderModal Component
 * 
 * Allows users to customize reminder times for a specific meeting:
 * - Checkbox picker for reminder times (5, 10, 15, 30, 40, 60 minutes)
 * - Highlights 40 minutes for on-site meetings (ADHD-friendly tip)
 * - Toggle between default and custom reminders
 * - Save/cancel actions
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Bell, Clock } from '@phosphor-icons/react'

interface Meeting {
  id: string
  title: string
  type: 'on-site' | 'online' | 'in-office'
  start_time: string
}

interface MeetingReminderModalProps {
  meeting: Meeting
  onClose: () => void
}

const DEFAULT_REMINDER_TIMES = [30, 15, 5]
const AVAILABLE_REMINDER_TIMES = [5, 10, 15, 30, 40, 60]

export function MeetingReminderModal({ meeting, onClose }: MeetingReminderModalProps) {
  const [useCustom, setUseCustom] = useState(false)
  const [selectedTimes, setSelectedTimes] = useState<number[]>(DEFAULT_REMINDER_TIMES)

  // Load saved reminders from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`meeting-reminders-${meeting.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSelectedTimes(parsed.times || DEFAULT_REMINDER_TIMES)
        setUseCustom(parsed.custom || false)
      }
    } catch (err) {
      console.error('Error loading saved reminders:', err)
    }
  }, [meeting.id])

  const handleToggleTime = (time: number) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter(t => t !== time))
    } else {
      setSelectedTimes([...selectedTimes, time].sort((a, b) => b - a))
    }
  }

  const handleSave = () => {
    try {
      const data = {
        times: selectedTimes,
        custom: useCustom
      }
      localStorage.setItem(`meeting-reminders-${meeting.id}`, JSON.stringify(data))
      onClose()
    } catch (err) {
      console.error('Error saving reminders:', err)
      onClose()
    }
  }

  const handleUseDefault = () => {
    setUseCustom(false)
    setSelectedTimes(DEFAULT_REMINDER_TIMES)
  }

  const handleUseCustom = () => {
    setUseCustom(true)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-200 p-6 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={24} weight="fill" className="text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-800">
                Przypomnienia
              </h2>
            </div>
            <p className="text-sm text-slate-600 truncate">
              {meeting.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          <div className="space-y-3">
            <button
              onClick={handleUseDefault}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                !useCustom
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  !useCustom ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                }`}>
                  {!useCustom && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-800 mb-1">
                    Domyślne przypomnienia
                  </div>
                  <div className="text-sm text-slate-600">
                    30, 15 i 5 minut przed spotkaniem
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={handleUseCustom}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                useCustom
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  useCustom ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                }`}>
                  {useCustom && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-800 mb-1">
                    Niestandardowe przypomnienia
                  </div>
                  <div className="text-sm text-slate-600">
                    Wybierz własne czasy przypomnień
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Custom Time Selection */}
          {useCustom && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-700">
                Kiedy przypomnieć?
              </div>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_REMINDER_TIMES.map((time) => {
                  const isSelected = selectedTimes.includes(time)
                  const isRecommendedForOnSite = meeting.type === 'on-site' && time === 40
                  
                  return (
                    <button
                      key={time}
                      onClick={() => handleToggleTime(time)}
                      className={`relative p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${isRecommendedForOnSite ? 'ring-2 ring-amber-300' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <i className="fa-solid fa-check text-white text-[10px]"></i>
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-sm font-semibold text-slate-800">
                            {time} min
                          </div>
                        </div>
                      </div>
                      {isRecommendedForOnSite && (
                        <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ⭐ Wizyta
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* ADHD Tip for on-site meetings */}
              {meeting.type === 'on-site' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-sm">💡</span>
                    <div className="text-xs text-amber-800">
                      <strong>Podpowiedź:</strong> Dla wizyt fizycznych zalecamy przypomnienie 
                      <strong> 40 minut przed</strong> - daje to czas na dojazd i przygotowanie.
                    </div>
                  </div>
                </div>
              )}

              {selectedTimes.length === 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-xs text-red-800">
                    ⚠️ Wybierz przynajmniej jedno przypomnienie
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <Clock size={20} weight="fill" className="text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-800 mb-1">
                  Aktywne przypomnienia
                </div>
                <div className="text-sm text-slate-600">
                  {useCustom && selectedTimes.length > 0 ? (
                    <>
                      {selectedTimes.sort((a, b) => b - a).map((time, idx) => (
                        <span key={time}>
                          {time} min{idx < selectedTimes.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {' '}przed spotkaniem
                    </>
                  ) : !useCustom ? (
                    '30, 15 i 5 minut przed spotkaniem'
                  ) : (
                    'Brak wybranych przypomnień'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={useCustom && selectedTimes.length === 0}
            className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}
