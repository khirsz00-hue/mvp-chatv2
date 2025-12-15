'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { JournalEntry, TodoistTask } from '@/types/journal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  Calendar,
  Microphone,
  ChartLine,
  FloppyDisk,
  Plus,
  X,
  Archive as ArchiveIcon,
} from '@phosphor-icons/react'
import { format } from 'date-fns'

interface JournalAssistantMainProps {
  onShowArchive: () => void
}

export function JournalAssistantMain({ onShowArchive }: JournalAssistantMainProps) {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Metrics state
  const [energy, setEnergy] = useState<number>(5)
  const [motivation, setMotivation] = useState<number>(5)
  const [sleepQuality, setSleepQuality] = useState<number>(5)
  const [hoursSlept, setHoursSlept] = useState<number>(7)
  const [notes, setNotes] = useState<string[]>([])

  // UI state
  const [newNote, setNewNote] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<TodoistTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [todoistToken, setTodoistToken] = useState<string | null>(null)

  // Voice recognition - using any for Web Speech API which doesn't have standard types
  const recognitionRef = useRef<any>(null)

  const {
    currentEntry,
    loading: savingEntry,
    fetchEntryByDate,
    saveEntry,
  } = useJournalEntries(userId)

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      setIsCheckingAuth(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      setIsCheckingAuth(false)
    }
    getUser()
  }, [])

  // Load entry for selected date
  useEffect(() => {
    if (userId && selectedDate) {
      fetchEntryByDate(selectedDate)
    }
  }, [userId, selectedDate, fetchEntryByDate])

  // Populate form when entry is loaded
  useEffect(() => {
    if (currentEntry) {
      setEnergy(currentEntry.energy || 5)
      setMotivation(currentEntry.motivation || 5)
      setSleepQuality(currentEntry.sleep_quality || 5)
      setHoursSlept(currentEntry.hours_slept || 7)
      setNotes(currentEntry.notes || [])
    } else {
      // Reset to defaults for new entry
      setEnergy(5)
      setMotivation(5)
      setSleepQuality(5)
      setHoursSlept(7)
      setNotes([])
    }
  }, [currentEntry])

  // Fetch user profile and Todoist token
  useEffect(() => {
    let isMounted = true

    const fetchUserProfile = async () => {
      if (!userId) return

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('todoist_token')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Error fetching user profile:', error)
          return
        }

        if (isMounted) {
          setTodoistToken(data?.todoist_token || null)
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
        // Don't show toast - this is just a fetch operation
      }
    }

    if (userId) {
      fetchUserProfile()
    }

    return () => {
      isMounted = false
    }
  }, [userId])

  // Fetch Todoist tasks when token is available
  useEffect(() => {
    let isMounted = true

    const fetchTodoistTasks = async () => {
      if (!todoistToken) return

      setLoadingTasks(true)
      try {
        const response = await fetch('/api/todoist/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: todoistToken, filter: 'today' }),
        })

        if (!response.ok) {
          console.error('Failed to fetch Todoist tasks:', response.status)
          if (isMounted) {
            setCompletedTasks([])
          }
          return
        }

        const data = await response.json()
        if (isMounted) {
          setCompletedTasks(data.tasks || [])
        }
      } catch (error: any) {
        console.error('Error fetching Todoist tasks:', error)
        if (isMounted) {
          setCompletedTasks([])
        }
      } finally {
        if (isMounted) {
          setLoadingTasks(false)
        }
      }
    }

    if (todoistToken) {
      fetchTodoistTasks()
    }

    return () => {
      isMounted = false
    }
  }, [todoistToken, selectedDate])

  // Refresh Todoist tasks
  const handleRefreshTodoistTasks = async () => {
    if (!todoistToken) return

    setLoadingTasks(true)
    try {
      const response = await fetch('/api/todoist/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: todoistToken, filter: 'today' }),
      })

      if (!response.ok) {
        console.error('Failed to fetch Todoist tasks:', response.status)
        setCompletedTasks([])
        return
      }

      const data = await response.json()
      setCompletedTasks(data.tasks || [])
    } catch (error: any) {
      console.error('Error fetching Todoist tasks:', error)
      setCompletedTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

  // Add note
  const handleAddNote = () => {
    if (!newNote.trim()) return
    setNotes((prev) => [...prev, newNote.trim()])
    setNewNote('')
  }

  // Remove note
  const handleRemoveNote = (index: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== index))
  }

  // Voice recording
  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Przeglądarka nie obsługuje rozpoznawania mowy', 'error')
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'pl-PL'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setNotes((prev) => [...prev, transcript])
      showToast('Notatka głosowa dodana', 'success')
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      showToast('Błąd rozpoznawania mowy', 'error')
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  // Save entry
  const handleSaveEntry = async () => {
    if (!userId) return

    try {
      const entryData: Partial<JournalEntry> = {
        date: selectedDate,
        energy,
        motivation,
        sleep_quality: sleepQuality,
        hours_slept: hoursSlept,
        completed_tasks_snapshot: completedTasks.map((t) => t.content),
        notes,
      }

      await saveEntry(entryData)
      showToast('Wpis zapisany', 'success')
    } catch (error: any) {
      console.error('Error saving entry:', error)
      showToast('Błąd zapisywania wpisu', 'error')
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Journal Assistant</h1>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Journal Assistant</h1>
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-purple/10 to-brand-pink/10 flex items-center justify-center mb-4">
            📔
          </div>
          <h2 className="text-xl font-semibold">Zaloguj się</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Aby korzystać z dziennika, musisz być zalogowany
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Journal Assistant
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Twój codzienny dziennik z ADHD</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={onShowArchive} variant="outline" className="gap-2">
            <ArchiveIcon size={20} weight="bold" />
            Archiwum
          </Button>
          <Button
            onClick={handleSaveEntry}
            disabled={savingEntry}
            className="gap-2"
          >
            <FloppyDisk size={20} weight="bold" />
            Zapisz
          </Button>
        </div>
      </div>

      {/* Date Picker */}
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} weight="bold" className="text-brand-purple" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ChartLine size={24} weight="bold" className="text-brand-purple" />
          Metryki
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Energy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Energia: {energy}/10
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Motivation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motywacja: {motivation}/10
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={motivation}
              onChange={(e) => setMotivation(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Sleep Quality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jakość snu: {sleepQuality}/10
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Hours Slept */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Godziny snu: {hoursSlept}h
            </label>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={hoursSlept}
              onChange={(e) => setHoursSlept(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Completed Tasks from Todoist */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Zadania Todoist</h3>

        {!todoistToken ? (
          <div className="text-sm text-gray-500 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            💡 <strong>Wskazówka:</strong> Chcesz połączyć z Todoist?
            Dodaj token API w ustawieniach profilu, aby automatycznie śledzić wykonane zadania.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-sm text-gray-700">
                Zaplanowane na dziś
              </h4>
              <Button
                onClick={handleRefreshTodoistTasks}
                variant="outline"
                size="sm"
                disabled={loadingTasks}
              >
                {loadingTasks ? 'Ładowanie...' : 'Odśwież'}
              </Button>
            </div>
            {completedTasks.length === 0 ? (
              <p className="text-sm text-gray-500">Brak zadań na dziś</p>
            ) : (
              <ul className="space-y-2">
                {completedTasks.map((task) => (
                  <li key={task.id} className="text-sm flex items-center gap-2">
                    <span className="text-gray-400">□</span>
                    {task.content}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      {/* Notes */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Notatki</h2>

        <div className="flex gap-2 mb-4">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
            placeholder="Dodaj notatkę..."
            className="flex-1"
          />
          <Button onClick={handleAddNote} size="sm" className="gap-2">
            <Plus size={16} weight="bold" />
            Dodaj
          </Button>
          <Button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            variant={isRecording ? 'destructive' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Microphone size={16} weight="bold" />
            {isRecording ? 'Stop' : 'Głos'}
          </Button>
        </div>

        {notes.length > 0 && (
          <ul className="space-y-2">
            {notes.map((note, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <span className="flex-1 text-sm">{note}</span>
                <button
                  onClick={() => handleRemoveNote(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={16} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
