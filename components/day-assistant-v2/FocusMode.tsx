/**
 * FocusMode Component
 * Provides a FOCUS button that blurs everything around and shows gentle reminders
 */

'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface FocusModeProps {
  isActive: boolean
  onToggle: () => void
  taskTitle: string
}

export function FocusMode({ isActive, onToggle, taskTitle }: FocusModeProps) {
  const [showReminder, setShowReminder] = useState(false)

  // Gentle reminder every 5 minutes - shake animation
  useEffect(() => {
    if (!isActive) return

    const reminderInterval = setInterval(() => {
      setShowReminder(true)
      setTimeout(() => setShowReminder(false), 2000) // Shake for 2 seconds
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(reminderInterval)
  }, [isActive])

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

      {/* Gentle reminder - shake */}
      {showReminder && isActive && (
        <style>{`
          @keyframes gentle-shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
            20%, 40%, 60%, 80% { transform: translateX(2px); }
          }
          .focus-reminder-shake {
            animation: gentle-shake 0.5s ease-in-out 3;
          }
        `}</style>
      )}
    </>
  )
}
