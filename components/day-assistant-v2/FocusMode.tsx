/**
 * FocusMode Component
 * Provides a FOCUS button that blurs everything around and shows gentle reminders
 */

'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Reminder interval: 5 minutes
const REMINDER_INTERVAL_MS = 5 * 60 * 1000

interface FocusModeProps {
  isActive: boolean
  onToggle: () => void
  onShakeReminder: () => void
  taskTitle: string
}

export function FocusMode({ isActive, onToggle, onShakeReminder, taskTitle }: FocusModeProps) {
  // Gentle reminder every 5 minutes - triggers shake via callback
  useEffect(() => {
    if (!isActive) return

    const reminderInterval = setInterval(() => {
      onShakeReminder()
    }, REMINDER_INTERVAL_MS)

    return () => clearInterval(reminderInterval)
  }, [isActive, onShakeReminder])

  return (
    <>
      {/* FOCUS Button */}
      <Button
        size="sm"
        variant={isActive ? 'default' : 'outline'}
        onClick={onToggle}
        className={cn(
          'gap-2 transition-all',
          isActive && 'bg-purple-600 hover:bg-purple-700 text-white'
        )}
        title={isActive ? 'Wyjdź z trybu focus' : 'Włącz tryb focus - ukryje rozpraszające elementy'}
      >
        {isActive ? <EyeSlash size={16} weight="fill" /> : <Eye size={16} weight="fill" />}
        {isActive ? 'Wyjdź' : 'FOCUS'}
      </Button>

      {/* Backdrop blur - covers everything around */}
      {isActive && (
        <div 
          className="fixed inset-0 z-[80] bg-white/60 backdrop-blur-md pointer-events-none"
          style={{ backdropFilter: 'blur(12px)' }}
        />
      )}
    </>
  )
}
