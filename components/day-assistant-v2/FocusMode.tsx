/**
 * FocusMode Component
 * Full-screen modal with blurred backdrop and centered timer display
 */

'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { X, Pause, Play, Stop } from '@phosphor-icons/react'

interface FocusModeTask {
  title: string
  elapsedSeconds: number
  isPaused?: boolean
}

interface FocusModeProps {
  task: FocusModeTask
  onExit: () => void
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
}

export function FocusMode({ task, onExit, onPause, onResume, onStop }: FocusModeProps) {
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Backdrop - blur everything */}
      <div 
        className="fixed inset-0 bg-black/20 z-[80]"
        style={{ backdropFilter: 'blur(12px)' }}
        onClick={onExit}
      />

      {/* Timer box - clear, above backdrop */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[90] bg-white rounded-xl shadow-2xl p-8 min-w-[320px]">
        {/* Timer display + controls - NO blur */}
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl mb-4 text-gray-800">{task.title}</h3>
          <div className="text-5xl font-mono font-bold text-purple-600 mb-2">
            {formatTime(task.elapsedSeconds)}
          </div>
          <p className="text-sm text-gray-500">Tryb Focus - Skoncentruj się na zadaniu</p>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 justify-center">
            {task.isPaused ? (
              onResume && (
                <Button onClick={onResume} className="flex-1 gap-2" variant="default">
                  <Play size={16} weight="fill" /> Wznów
                </Button>
              )
            ) : (
              onPause && (
                <Button onClick={onPause} className="flex-1 gap-2" variant="outline">
                  <Pause size={16} weight="fill" /> Pauza
                </Button>
              )
            )}
            {onStop && (
              <Button onClick={onStop} className="flex-1 gap-2" variant="destructive">
                <Stop size={16} weight="fill" /> Stop
              </Button>
            )}
          </div>
          <Button 
            onClick={onExit}
            className="w-full gap-2"
            variant="outline"
          >
            <X size={16} weight="bold" /> Wyjdź z Focus
          </Button>
        </div>
      </div>
    </>
  )
}
