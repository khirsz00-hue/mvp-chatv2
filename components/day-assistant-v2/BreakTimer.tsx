/**
 * BreakTimer Component
 * Modal for selecting and managing break duration
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import { XCircle, Coffee } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface BreakTimerProps {
  isOpen: boolean
  onClose: () => void
  onStartBreak: (durationMinutes: number) => void
}

const BREAK_DURATIONS = [
  { minutes: 5, label: '5 min', emoji: '☕' },
  { minutes: 10, label: '10 min', emoji: '🍵' },
  { minutes: 15, label: '15 min', emoji: '🥤' },
  { minutes: 30, label: '30 min', emoji: '🍽️' }
]

export function BreakTimer({ isOpen, onClose, onStartBreak }: BreakTimerProps) {
  const [selectedDuration, setSelectedDuration] = useState(15)
  const [isActive, setIsActive] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (isActive && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            handleBreakComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, remainingSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBreakComplete = () => {
    setIsActive(false)
    setRemainingSeconds(0)
    toast.success('🎉 Przerwa zakończona! Czas wracać do pracy.', {
      duration: 5000
    })
    onClose()
  }

  const handleStart = () => {
    setRemainingSeconds(selectedDuration * 60)
    setIsActive(true)
    onStartBreak(selectedDuration)
    toast.success(`☕ Przerwa ${selectedDuration} min rozpoczęta!`)
  }

  const handleCancel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsActive(false)
    setRemainingSeconds(0)
    onClose()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Coffee size={24} className="text-green-600" />
              {isActive ? 'Przerwa w toku' : 'Dodaj przerwę'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isActive 
                ? 'Odpoczywaj - zostało jeszcze trochę czasu' 
                : 'Wybierz długość przerwy'}
            </p>
          </div>
          <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
            <XCircle size={24} />
          </button>
        </div>

        {!isActive ? (
          <>
            {/* Duration selection */}
            <div className="grid grid-cols-2 gap-3">
              {BREAK_DURATIONS.map(duration => (
                <button
                  key={duration.minutes}
                  onClick={() => setSelectedDuration(duration.minutes)}
                  className={`p-4 rounded-lg border-2 font-medium transition-all ${
                    selectedDuration === duration.minutes
                      ? 'bg-green-100 border-green-500 text-green-900'
                      : 'bg-white border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{duration.emoji}</div>
                  <div className="text-sm">{duration.label}</div>
                </button>
              ))}
            </div>

            {/* Start button */}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>
                Anuluj
              </Button>
              <Button 
                onClick={handleStart}
                className="bg-green-600 hover:bg-green-700"
              >
                <Coffee size={16} className="mr-1" /> Rozpocznij przerwę
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Active timer display */}
            <div className="text-center py-8">
              <div className="text-6xl font-bold text-green-600 mb-4">
                {formatTime(remainingSeconds)}
              </div>
              <div className="text-sm text-gray-600 mb-6">
                Odpoczywasz ({selectedDuration} min)
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-green-100 rounded-full h-3 mb-4">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${((selectedDuration * 60 - remainingSeconds) / (selectedDuration * 60)) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Cancel button */}
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Zakończ przerwę wcześniej
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
