/**
 * VoiceRambleModal Component
 * Continuous voice input with live AI processing (Todoist Ramble-style)
 * User speaks continuously, AI processes in real-time and shows parsed tasks
 */

'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useVoiceRamble } from '@/hooks/useVoiceRamble'
import { CONTEXT_LABELS, CONTEXT_COLORS } from '@/lib/services/contextInferenceService'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

interface VoiceRambleModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VoiceRambleModal({ isOpen, onClose }: VoiceRambleModalProps) {
  const {
    isRecording,
    liveTranscription,
    parsedTasks,
    lastAction,
    isProcessing,
    isSpeechRecognitionSupported,
    startRecording,
    stopRecording,
    handleCancelAll,
    handleSaveAll
  } = useVoiceRamble()

  // Start recording when modal opens
  useEffect(() => {
    if (isOpen && !isRecording) {
      startRecording()
    }
  }, [isOpen, isRecording, startRecording])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        handleStop()
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, parsedTasks])

  const handleStop = () => {
    stopRecording()
  }

  const handleCancel = () => {
    handleCancelAll()
    onClose()
  }

  const handleSave = async () => {
    const success = await handleSaveAll()
    if (success) {
      onClose()
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Dzisiaj'

    try {
      const date = parseISO(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (dateStr === today.toISOString().split('T')[0]) {
        return 'Dzisiaj'
      } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
        return 'Jutro'
      } else {
        return format(date, 'd MMM', { locale: pl })
      }
    } catch {
      return dateStr
    }
  }

  const getContextLabel = (contextType: string) => {
    return CONTEXT_LABELS[contextType as keyof typeof CONTEXT_LABELS] || contextType
  }

  // Don't render if browser doesn't support speech recognition
  if (!isSpeechRecognitionSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🎤 Dyktowanie głosowe</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-lg mb-4">
              ⚠️ Twoja przeglądarka nie wspiera dyktowania głosowego.
            </p>
            <p className="text-muted-foreground">
              Użyj <strong>Chrome</strong> lub <strong>Edge</strong> aby korzystać z tej funkcji.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              🎤 Dyktuj zadania...
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStop}
              className="text-sm"
            >
              ⏹️ Zatrzymaj
            </Button>
          </div>
        </DialogHeader>

        {/* Live Transcription */}
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 min-h-[80px]">
          <p className="text-sm text-gray-600 mb-1">💬 Mówisz:</p>
          <p className="text-lg font-medium">
            {liveTranscription || 'Zacznij mówić...'}
          </p>
        </div>

        {/* Parsed Tasks */}
        <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-white border-2 border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-purple-700">
              ✅ Zrozumiałem ({parsedTasks.length} {parsedTasks.length === 1 ? 'zadanie' : 'zadań'}):
            </p>
            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600" />
                Przetwarzam...
              </div>
            )}
          </div>

          {parsedTasks.length === 0 && (
            <p className="text-sm text-gray-500 italic py-4 text-center">
              Czekam na pierwsze zadanie...
            </p>
          )}

          {parsedTasks.map((task, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
            >
              <p className="font-medium text-gray-900">{task.title}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <span>📅 {formatDate(task.due_date)}</span>
                <span>⏱️ {task.estimate_min} min</span>
                <span>🏷️ {getContextLabel(task.context_type)}</span>
              </div>
            </motion.div>
          ))}

          {lastAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
            >
              {lastAction}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleCancel}>
            ❌ Anuluj wszystko
          </Button>
          <Button
            onClick={handleSave}
            disabled={parsedTasks.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            ✅ Zapisz wszystkie ({parsedTasks.length})
          </Button>
        </DialogFooter>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-center text-gray-400 mt-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border">Esc</kbd> = Zatrzymaj •{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border">Ctrl+Enter</kbd> = Zapisz
        </div>
      </DialogContent>
    </Dialog>
  )
}
