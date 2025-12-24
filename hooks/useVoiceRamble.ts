/**
 * useVoiceRamble Hook
 * Manages continuous voice recording and live AI parsing for task creation
 * Uses Web Speech API for real-time transcription
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { debounce } from 'lodash'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export interface ParsedTask {
  title: string
  due_date: string | null
  estimate_min: number
  context_type: string
}

interface ParseResponse {
  action: 'ADD_TASKS' | 'UNDO' | 'CANCEL_ALL'
  tasks: ParsedTask[]
  message?: string
}

export function useVoiceRamble() {
  const [isRecording, setIsRecording] = useState(false)
  const [liveTranscription, setLiveTranscription] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const fullTranscriptRef = useRef('')
  const isRecordingRef = useRef(false) // Use ref to avoid stale closure in onend

  // Check browser compatibility
  const isSpeechRecognitionSupported = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  }, [])

  // Parse transcript with AI (debounced)
  const parseTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return

    setIsProcessing(true)
    setLastAction(null)

    try {
      const response = await fetch('/api/voice/parse-ramble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          existingTasks: parsedTasks
        })
      })

      if (!response.ok) {
        throw new Error('Failed to parse transcript')
      }

      const data: ParseResponse = await response.json()

      if (data.action === 'UNDO') {
        setParsedTasks(prev => {
          if (prev.length === 0) return prev
          const removed = prev[prev.length - 1]
          setLastAction(`⚠️ Cofnięto: "${removed.title}"`)
          return prev.slice(0, -1)
        })
      } else if (data.action === 'CANCEL_ALL') {
        handleCancelAll()
      } else if (data.action === 'ADD_TASKS') {
        setParsedTasks(data.tasks)
        if (data.message) {
          setLastAction(data.message)
        }
      }
    } catch (error) {
      console.error('❌ [Voice Ramble] Parse error:', error)
      toast.error('Nie udało się przetworzyć dyktowania')
    } finally {
      setIsProcessing(false)
    }
  }, [parsedTasks])

  // Debounced parse - triggers 1.5s after user stops talking
  const debouncedParse = useMemo(
    () => debounce(parseTranscript, 1500),
    [parseTranscript]
  )

  // Start recording
  const startRecording = useCallback(() => {
    if (!isSpeechRecognitionSupported) {
      toast.error(
        'Twoja przeglądarka nie wspiera dyktowania. Użyj Chrome lub Edge.',
        { duration: 5000 }
      )
      return
    }

    try {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      const recognition = new SpeechRecognitionAPI()
      recognition.lang = 'pl-PL'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          fullTranscriptRef.current += finalTranscript
        }

        const displayTranscript = fullTranscriptRef.current + interimTranscript
        setLiveTranscription(displayTranscript)

        // Trigger parsing when user stops talking (debounced)
        if (finalTranscript) {
          debouncedParse(fullTranscriptRef.current)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ [Voice Ramble] Speech recognition error:', event.error)
        if (event.error === 'no-speech') {
          // Don't show error for no-speech, it's normal
          return
        }
        toast.error(`Błąd nagrywania: ${event.error}`)
      }

      recognition.onend = () => {
        console.log('🔍 [Voice Ramble] Recognition ended')
        // Auto-restart if still recording (check ref to avoid stale closure)
        if (isRecordingRef.current && recognitionRef.current) {
          try {
            recognition.start()
          } catch (error) {
            console.error('❌ [Voice Ramble] Failed to restart:', error)
          }
        }
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)
      isRecordingRef.current = true
      fullTranscriptRef.current = ''
      setLiveTranscription('')
      setParsedTasks([])
      setLastAction(null)

      console.log('✅ [Voice Ramble] Recording started')
    } catch (error) {
      console.error('❌ [Voice Ramble] Failed to start recording:', error)
      toast.error('Nie udało się uruchomić nagrywania')
    }
  }, [isSpeechRecognitionSupported, debouncedParse])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
    isRecordingRef.current = false
    debouncedParse.cancel()
    console.log('⏹️ [Voice Ramble] Recording stopped')
  }, [debouncedParse])

  // Cancel all tasks
  const handleCancelAll = useCallback(() => {
    stopRecording()
    setParsedTasks([])
    setLiveTranscription('')
    fullTranscriptRef.current = ''
    setLastAction(null)
    toast.info('Anulowano wszystkie zadania')
  }, [stopRecording])

  // Save all tasks
  const handleSaveAll = useCallback(async () => {
    if (parsedTasks.length === 0) {
      toast.error('Brak zadań do zapisania')
      return
    }

    stopRecording()

    try {
      const response = await fetch('/api/voice/save-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: parsedTasks })
      })

      if (!response.ok) {
        throw new Error('Failed to save tasks')
      }

      const { saved } = await response.json()

      toast.success(`✅ Dodano ${saved} ${saved === 1 ? 'zadanie' : 'zadań'} głosem`)

      // Dispatch event for queue refresh
      window.dispatchEvent(new CustomEvent('voice-tasks-saved'))

      // Reset state
      setParsedTasks([])
      setLiveTranscription('')
      fullTranscriptRef.current = ''
      setLastAction(null)

      return true
    } catch (error) {
      console.error('❌ [Voice Ramble] Save error:', error)
      toast.error('Nie udało się zapisać zadań')
      return false
    }
  }, [parsedTasks, stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      debouncedParse.cancel()
    }
  }, [debouncedParse])

  return {
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
  }
}
