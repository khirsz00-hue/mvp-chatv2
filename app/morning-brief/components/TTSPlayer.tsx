'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Stop } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'

interface TTSPlayerProps {
  text: string
  autoPlay?: boolean
}

// Delay before auto-play to allow page render and avoid race conditions
const AUTO_PLAY_DELAY_MS = 500

export default function TTSPlayer({ text, autoPlay = false }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      console.warn('⚠️ Speech synthesis not supported in this browser')
      return
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pl-PL'
    utterance.rate = 0.9 // Slightly slower for better comprehension
    utterance.pitch = 1.0

    utterance.onstart = () => {
      console.log('🔊 TTS started')
      setIsPlaying(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      console.log('🔇 TTS ended')
      setIsPlaying(false)
      setIsPaused(false)
    }

    utterance.onerror = (event) => {
      console.error('❌ TTS error:', event)
      setIsPlaying(false)
      setIsPaused(false)
    }

    utteranceRef.current = utterance

    // Auto-play if enabled (with delay to allow page to fully render)
    if (autoPlay && text) {
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, AUTO_PLAY_DELAY_MS)
    }

    return () => {
      // Cleanup on unmount
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [text, autoPlay])

  const handlePlay = () => {
    if (!utteranceRef.current) return

    if (isPaused) {
      // Resume
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
    } else {
      // Start new
      window.speechSynthesis.cancel() // Cancel any ongoing speech
      window.speechSynthesis.speak(utteranceRef.current)
    }
  }

  const handlePause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  if (!text) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {!isPlaying && !isPaused && (
        <Button
          onClick={handlePlay}
          variant="default"
          size="lg"
          className="flex items-center gap-2"
        >
          <Play size={20} weight="fill" />
          Odtwórz dzień
        </Button>
      )}

      {isPlaying && (
        <Button
          onClick={handlePause}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <Pause size={20} weight="fill" />
          Pauza
        </Button>
      )}

      {isPaused && (
        <Button
          onClick={handlePlay}
          variant="default"
          size="lg"
          className="flex items-center gap-2"
        >
          <Play size={20} weight="fill" />
          Wznów
        </Button>
      )}

      {(isPlaying || isPaused) && (
        <Button
          onClick={handleStop}
          variant="ghost"
          size="lg"
          className="flex items-center gap-2"
        >
          <Stop size={20} weight="fill" />
          Stop
        </Button>
      )}
    </div>
  )
}
