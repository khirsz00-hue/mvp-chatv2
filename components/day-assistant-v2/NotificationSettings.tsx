/**
 * NotificationSettings Component
 * 
 * Allows users to configure meeting notification preferences:
 * - Enable/disable notifications
 * - Set default reminder times (5, 10, 15, 30, 60, 120 minutes before meeting)
 * - Configure notification types (sound, browser, in-app banner)
 */

'use client'

import { useState } from 'react'
import { Bell, Plus, X } from '@phosphor-icons/react'

interface NotificationSettingsProps {
  settings: {
    enabled: boolean
    defaultReminderTimes: number[]
    soundEnabled: boolean
    browserNotifications: boolean
    inAppBanner: boolean
  }
  onSave: (settings: any) => void
}

const PRESET_TIMES = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 godz', value: 60 },
  { label: '2 godz', value: 120 }
]

export function NotificationSettings({ settings, onSave }: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(settings.enabled)
  const [reminderTimes, setReminderTimes] = useState(settings.defaultReminderTimes)
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled)
  const [browserNotifications, setBrowserNotifications] = useState(settings.browserNotifications)
  const [inAppBanner, setInAppBanner] = useState(settings.inAppBanner)

  const addReminderTime = (minutes: number) => {
    if (!reminderTimes.includes(minutes)) {
      setReminderTimes([...reminderTimes, minutes].sort((a, b) => b - a))
    }
  }

  const removeReminderTime = (minutes: number) => {
    setReminderTimes(reminderTimes.filter(t => t !== minutes))
  }

  const handleSave = () => {
    onSave({
      enabled,
      defaultReminderTimes: reminderTimes,
      soundEnabled,
      browserNotifications,
      inAppBanner
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell size={24} className="text-indigo-600" weight="fill" />
        <h3 className="text-lg font-bold text-slate-800">Powiadomienia o spotkaniach</h3>
      </div>

      {/* Enable/Disable */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Włącz powiadomienia o spotkaniach
          </span>
        </label>
        <p className="text-xs text-slate-500 mt-1 ml-8">
          Otrzymasz przypomnienia przed każdym spotkaniem w kalendarzu
        </p>
      </div>

      {enabled && (
        <>
          {/* Reminder Times */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Kiedy przypominać? (przed spotkaniem)
            </label>
            
            {/* Selected times */}
            <div className="flex flex-wrap gap-2 mb-3">
              {reminderTimes.map(minutes => (
                <div 
                  key={minutes}
                  className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200"
                >
                  <span className="text-sm font-medium">
                    {minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`}
                  </span>
                  <button 
                    onClick={() => removeReminderTime(minutes)}
                    className="text-indigo-500 hover:text-indigo-700"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
              ))}
            </div>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              {PRESET_TIMES.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => addReminderTime(preset.value)}
                  disabled={reminderTimes.includes(preset.value)}
                  className={`
                    px-3 py-1.5 rounded-lg border text-sm font-medium transition-all
                    ${reminderTimes.includes(preset.value)
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-500 hover:text-indigo-600'
                    }
                  `}
                >
                  <Plus size={14} className="inline mr-1" />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification types */}
          <div className="space-y-3 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-slate-700">
                🔊 Dźwięk powiadomienia
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={browserNotifications}
                onChange={(e) => setBrowserNotifications(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-slate-700">
                🌐 Powiadomienia przeglądarki (desktop)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={inAppBanner}
                onChange={(e) => setInAppBanner(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-slate-700">
                📢 Banner w aplikacji (zawsze widoczny)
              </span>
            </label>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Zapisz ustawienia
          </button>
        </>
      )}
    </div>
  )
}
