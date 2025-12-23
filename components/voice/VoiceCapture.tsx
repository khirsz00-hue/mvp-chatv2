'use client'

import { useState } from 'react'
import { Microphone, X } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/components/ui/Toast'

export function VoiceCapture() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { showToast } = useToast()

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setIsProcessing(true)

      // TODO: Implement actual voice recording and transcription
      // For MVP, show a placeholder message
      setTimeout(() => {
        setIsProcessing(false)
        showToast('Funkcja głosowa będzie dostępna wkrótce!', 'info')
      }, 1500)
    } else {
      // Start recording
      setIsRecording(true)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleRecord}
        disabled={isProcessing}
        className={`
          w-16 h-16 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-200
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-gradient-to-r from-brand-purple to-brand-pink hover:scale-110'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          text-white
        `}
        title="Nagrywanie głosowe"
      >
        {isProcessing ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
        ) : isRecording ? (
          <X size={28} weight="bold" />
        ) : (
          <Microphone size={28} weight="fill" />
        )}
      </button>
    </div>
  )
}
