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
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
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

// Error messages map for user-friendly error display
const ERROR_MESSAGES: Record<string, string> = {
  'network': 'Błąd połączenia. Sprawdź internet i spróbuj ponownie.',
  'not-allowed': 'Brak dostępu do mikrofonu. Zezwól w ustawieniach przeglądarki.',
  'no-speech': 'Nie wykryto mowy. Spróbuj mówić głośniej.',
  'aborted': 'Nagrywanie przerwane.',
  'audio-capture': 'Nie wykryto mikrofonu.',
  'service-not-allowed': 'Usługa rozpoznawania mowy niedostępna.'
}

export function useVoiceRamble() {
  const [isRecording, setIsRecording] = useState(false)
  const [liveTranscription, setLiveTranscription] = useState('')
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isRecognitionActive, setIsRecognitionActive] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const fullTranscriptRef = useRef('')
  const isRecordingRef = useRef(false) // Use ref to avoid stale closure in onend
  const retryCountRef = useRef(0) // Track retry count in ref for onend callback
  const maxRetries = 3

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

  // Safe start function
  const safeStartRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) {
      console.warn('[Voice Ramble] No recognition instance available')
      return
    }

    // ✅ Check if already running
    if (isRecognitionActive) {
      console.log('[Voice Ramble] Already running, skipping start')
      return
    }

    try {
      recognition.start()
      console.log('[Voice Ramble] Started successfully')
    } catch (error: any) {
      if (error.name === 'InvalidStateError') {
        console.warn('[Voice Ramble] Recognition already started, ignoring')
      } else {
        console.error('[Voice Ramble] Failed to start:', error)
        toast.error('Nie udało się uruchomić rozpoznawania mowy')
      }
    }
  }, [isRecognitionActive])

  // Network error retry with exponential backoff
  const handleNetworkError = useCallback(() => {
    const currentRetry = retryCountRef.current
    
    if (currentRetry >= maxRetries) {
      console.error('[Voice Ramble] Max retries reached')
      toast.error('Problem z połączeniem. Spróbuj ponownie później.')
      setIsRecording(false)
      isRecordingRef.current = false
      return
    }

    retryCountRef.current++
    setRetryCount(retryCountRef.current)
    const delay = 2000 * currentRetry  // 0s, 2s, 4s
    
    console.log(`[Voice Ramble] Network error - retrying in ${delay}ms... (${currentRetry + 1}/${maxRetries})`)
    toast.info(`Ponawiam próbę (${currentRetry + 1}/${maxRetries})...`)

    setTimeout(() => {
      // ✅ Check state before retry
      if (!isRecognitionActive && isRecordingRef.current) {
        console.log('[Voice Ramble] Retrying after network error')
        safeStartRecognition()
      } else {
        console.log('[Voice Ramble] Recognition already active or stopped, skipping retry')
      }
    }, delay)
  }, [isRecognitionActive, safeStartRecognition])

  // No-speech auto-restart
  const handleNoSpeech = useCallback(() => {
    console.log('[Voice Ramble] No speech detected, restarting...')
    
    // Short delay before restart
    setTimeout(() => {
      if (!isRecognitionActive && isRecordingRef.current) {
        safeStartRecognition()
      }
    }, 500)
  }, [isRecognitionActive, safeStartRecognition])

  // Setup recognition handlers
  const setupRecognitionHandlers = useCallback((recognition: SpeechRecognition) => {
    // Track state changes
    recognition.onstart = () => {
      console.log('✅ [Voice Ramble] onstart fired')
      setIsRecognitionActive(true)
      retryCountRef.current = 0  // Reset retry counter on successful start
      setRetryCount(0)
    }

    recognition.onend = () => {
      console.log('🔍 [Voice Ramble] onend fired')
      setIsRecognitionActive(false)
      
      // Auto-restart if still recording (check ref to avoid stale closure)
      if (isRecordingRef.current && recognitionRef.current) {
        // Use setTimeout to avoid immediate restart issues
        setTimeout(() => {
          if (isRecordingRef.current) {
            safeStartRecognition()
          }
        }, 100)
      }
    }

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
        console.log('[Voice Ramble] Final:', finalTranscript)
        fullTranscriptRef.current += finalTranscript
      }

      if (interimTranscript) {
        console.log('[Voice Ramble] Interim:', interimTranscript)
      }

      const displayTranscript = fullTranscriptRef.current + interimTranscript
      setLiveTranscription(displayTranscript)

      // Trigger parsing when user stops talking (debounced)
      if (finalTranscript) {
        debouncedParse(fullTranscriptRef.current)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('❌ [Voice Ramble] Error:', event.error, event)
      setIsRecognitionActive(false)  // ✅ Update state on error

      if (event.error === 'network') {
        handleNetworkError()
      } else if (event.error === 'no-speech') {
        handleNoSpeech()
      } else if (event.error === 'aborted') {
        console.log('[Voice Ramble] Recognition aborted')
      } else if (event.error === 'audio-capture') {
        toast.error('Nie można uzyskać dostępu do mikrofonu')
        setIsRecording(false)
        isRecordingRef.current = false
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast.error('Brak uprawnień do mikrofonu')
        setIsRecording(false)
        isRecordingRef.current = false
      } else {
        toast.error(`Błąd rozpoznawania: ${event.error}`)
      }
    }
  }, [debouncedParse, handleNetworkError, handleNoSpeech, safeStartRecognition])

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

      recognitionRef.current = recognition
      
      // Setup event handlers
      setupRecognitionHandlers(recognition)

      // Initialize state
      setIsRecording(true)
      isRecordingRef.current = true
      retryCountRef.current = 0
      setRetryCount(0)
      fullTranscriptRef.current = ''
      setLiveTranscription('')
      setParsedTasks([])
      setLastAction(null)

      // Start recognition
      safeStartRecognition()

      console.log('✅ [Voice Ramble] Recording initialized')
    } catch (error) {
      console.error('❌ [Voice Ramble] Failed to start recording:', error)
      toast.error('Nie udało się uruchomić nagrywania')
    }
  }, [isSpeechRecognitionSupported, setupRecognitionHandlers, safeStartRecognition])

  // Stop recording
  const stopRecording = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) {
      console.log('[Voice Ramble] No recognition instance to stop')
      return
    }

    // ✅ Check if running before stop
    if (!isRecognitionActive && !isRecordingRef.current) {
      console.log('[Voice Ramble] Not running, skipping stop')
      return
    }

    try {
      recognition.stop()
      recognitionRef.current = null
      setIsRecording(false)
      isRecordingRef.current = false
      setIsRecognitionActive(false)
      debouncedParse.cancel()
      console.log('⏹️ [Voice Ramble] Stopped successfully')
    } catch (error) {
      console.error('[Voice Ramble] Failed to stop:', error)
      // Force cleanup even if stop fails
      recognitionRef.current = null
      setIsRecording(false)
      isRecordingRef.current = false
      setIsRecognitionActive(false)
      debouncedParse.cancel()
    }
  }, [isRecognitionActive, debouncedParse])

  // Cancel all tasks
  const handleCancelAll = useCallback(() => {
    stopRecording()
    setParsedTasks([])
    setLiveTranscription('')
    fullTranscriptRef.current = ''
    setLastAction(null)
    retryCountRef.current = 0
    setRetryCount(0)
    toast.info('Anulowano wszystkie zadania')
  }, [stopRecording])

  // Save all tasks
  const handleSaveAll = useCallback(async () => {
    if (parsedTasks.length === 0) {
      toast.error('Brak zadań do zapisania')
      return false
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
      retryCountRef.current = 0
      setRetryCount(0)

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
