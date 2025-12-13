'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getTodoistToken } from '@/lib/journal'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { JournalEntry, TodoistTask } from '@/types/journal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import {
  Calendar,
  Sparkle,
  Microphone,
  ChartLine,
  FloppyDisk,
  Plus,
  X,
  Archive as ArchiveIcon,
} from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

interface JournalAssistantMainProps {
  onShowArchive: () => void
}

export function JournalAssistantMain({ onShowArchive }: JournalAssistantMainProps) {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Metrics state
  const [energy, setEnergy] = useState<number>(5)
  const [motivation, setMotivation] = useState<number>(5)
  const [sleepQuality, setSleepQuality] = useState<number>(5)
  const [hoursSlept, setHoursSlept] = useState<number>(7)
  const [sleepTime, setSleepTime] = useState<string>('')
  const [wakeTime, setWakeTime] = useState<string>('')
  const [plannedTasks, setPlannedTasks] = useState<string>('')
  const [notes, setNotes] = useState<string[]>([])
  const [comments, setComments] = useState<string[]>([])
  const [aiSummary, setAiSummary] = useState<string>('')

  // UI state
  const [newNote, setNewNote] = useState<string>('')
  const [newComment, setNewComment] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<TodoistTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
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
      setSleepTime(currentEntry.sleep_time || '')
      setWakeTime(currentEntry.wake_time || '')
      setPlannedTasks(currentEntry.planned_tasks || '')
      setNotes(currentEntry.notes || [])
      setComments(currentEntry.comments || [])
      setAiSummary(currentEntry.ai_summary || '')
    } else {
      // Reset to defaults for new entry
      setEnergy(5)
      setMotivation(5)
      setSleepQuality(5)
      setHoursSlept(7)
      setSleepTime('')
      setWakeTime('')
      setPlannedTasks('')
      setNotes([])
      setComments([])
      setAiSummary('')
    }
  }, [currentEntry])

  // Fetch completed Todoist tasks
  const fetchCompletedTasks = useCallback(async () => {
    if (!userId) return

    setLoadingTasks(true)
    try {
      const token = await getTodoistToken(userId)
      if (!token) {
        showToast('Nie znaleziono tokenu Todoist', 'error')
        return
      }

      // Use existing API endpoint but pass token in request body for security
      // Note: The Todoist REST API /tasks endpoint only returns active (non-completed) tasks
      // For completed tasks, we would need to use the Sync API which requires different implementation
      // For MVP, we'll show active tasks that the user can mark as completed
      const response = await fetch('/api/todoist/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, filter: 'today' }),
      })

      if (!response.ok) {
        // Fallback to GET method if POST is not supported
        const getFallback = await fetch(`/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=today`)
        if (!getFallback.ok) {
          throw new Error('Failed to fetch tasks')
        }
        const data = await getFallback.json()
        setCompletedTasks(data.tasks || [])
        return
      }

      const data = await response.json()
      setCompletedTasks(data.tasks || [])
    } catch (error: any) {
      console.error('Error fetching Todoist tasks:', error)
      showToast('Błąd pobierania zadań z Todoist', 'error')
    } finally {
      setLoadingTasks(false)
    }
  }, [userId, showToast])

  // Load Todoist tasks on mount
  useEffect(() => {
    if (userId) {
      fetchCompletedTasks()
    }
  }, [userId, fetchCompletedTasks])

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

  // Add comment
  const handleAddComment = () => {
    if (!newComment.trim()) return
    setComments((prev) => [...prev, newComment.trim()])
    setNewComment('')
  }

  // Remove comment
  const handleRemoveComment = (index: number) => {
    setComments((prev) => prev.filter((_, i) => i !== index))
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

  // Generate AI summary
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const response = await fetch('/api/journal/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          energy,
          motivation,
          sleepQuality,
          hoursSlept,
          notes,
          completedTasks: completedTasks.map((t) => t.content),
          plannedTasks,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setAiSummary(data.summary)
      showToast('Podsumowanie wygenerowane', 'success')
    } catch (error: any) {
      console.error('Error generating summary:', error)
      showToast('Błąd generowania podsumowania', 'error')
    } finally {
      setIsGeneratingSummary(false)
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
        sleep_time: sleepTime || undefined,
        wake_time: wakeTime || undefined,
        planned_tasks: plannedTasks,
        completed_tasks_snapshot: completedTasks.map((t) => t.content),
        notes,
        comments,
        ai_summary: aiSummary || undefined,
      }

      await saveEntry(entryData)
      showToast('Wpis zapisany', 'success')
    } catch (error: any) {
      console.error('Error saving entry:', error)
      showToast('Błąd zapisywania wpisu', 'error')
    }
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

          {/* Sleep Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Czas zaśnięcia
            </label>
            <Input
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
            />
          </div>

          {/* Wake Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Czas przebudzenia
            </label>
            <Input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Planned Tasks */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Zaplanowane zadania</h2>
        <Textarea
          value={plannedTasks}
          onChange={(e) => setPlannedTasks(e.target.value)}
          placeholder="Wpisz swoje cele na dziś..."
          rows={4}
        />
      </Card>

      {/* Completed Tasks from Todoist */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Ukończone zadania (Todoist)</h2>
          <Button
            onClick={fetchCompletedTasks}
            variant="outline"
            size="sm"
            disabled={loadingTasks}
          >
            {loadingTasks ? 'Ładowanie...' : 'Odśwież'}
          </Button>
        </div>
        {completedTasks.length === 0 ? (
          <p className="text-gray-500 text-sm">Brak ukończonych zadań</p>
        ) : (
          <ul className="space-y-2">
            {completedTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span>{task.content}</span>
              </li>
            ))}
          </ul>
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

      {/* Comments */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Komentarze</h2>

        <div className="flex gap-2 mb-4">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Dodaj komentarz..."
            className="flex-1"
          />
          <Button onClick={handleAddComment} size="sm" className="gap-2">
            <Plus size={16} weight="bold" />
            Dodaj
          </Button>
        </div>

        {comments.length > 0 && (
          <ul className="space-y-2">
            {comments.map((comment, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <span className="flex-1 text-sm">{comment}</span>
                <button
                  onClick={() => handleRemoveComment(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={16} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* AI Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkle size={24} weight="bold" className="text-brand-purple" />
            Podsumowanie AI
          </h2>
          <Button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className="gap-2"
          >
            <Sparkle size={16} weight="bold" />
            {isGeneratingSummary ? 'Generowanie...' : 'Generuj'}
          </Button>
        </div>

        {aiSummary ? (
          <div className="p-4 bg-gradient-to-br from-brand-purple/5 to-brand-pink/5 rounded-lg">
            <p className="text-gray-700 leading-relaxed">{aiSummary}</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Kliknij &quot;Generuj&quot;, aby utworzyć podsumowanie dnia
          </p>
        )}
      </Card>
    </div>
  )
}
