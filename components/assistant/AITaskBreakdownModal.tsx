'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Sparkle,
  Clock,
  Check,
  X,
  ArrowRight,
  Lightning,
  Question,
  Fire,
  ThumbsUp,
  ThumbsDown
} from '@phosphor-icons/react'
import { 
  getProgress, 
  createProgress, 
  updateProgress, 
  completeStep,
  deleteProgress,
  addSubtaskToProgress,
  AIAssistantProgress 
} from '@/lib/services/aiAssistantProgressService'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabaseClient'

interface Task {
  id: string
  content: string
  description?: string
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
}

interface AITaskBreakdownModalProps {
  open: boolean
  onClose: () => void
  task: Task
  onCreateSubtasks: (subtasks: Array<{
    content: string
    description?: string
    duration?: number
    duration_unit?: string
  }>) => Promise<void>
  userId?: string  // Add userId to track progress
}

interface Subtask {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  isBackup?: boolean
  completed?: boolean
  subtaskId?: string  // Database subtask ID after creation
}

interface BreakdownRequestBody {
  taskContent: string
  taskDescription?: string
  mode: 'light' | 'stuck' | 'crisis'
  maxSubtasks: number
  qaContext?: string
  maxMinutes?: number
  completedContext?: string
}

interface AISubtaskResponse {
  title: string
  description: string
  estimatedMinutes?: number
}

interface BreakdownAPIResponse {
  subtasks: AISubtaskResponse[]
}

type ModeType = 'light' | 'stuck' | 'crisis'
type ViewMode = 'mode-selection' | 'questions' | 'single-subtask'

// Error messages
const ERROR_MESSAGES = {
  LIGHT_MODE: 'Nie udało się wygenerować kroków w trybie lekkim. Spróbuj ponownie lub wybierz inny tryb.',
  STUCK_MODE: 'Nie udało się wygenerować pierwszego kroku. Spróbuj ponownie.',
  CRISIS_MODE: 'Nie udało się wygenerować pierwszego kroku. Spróbuj ponownie.',
  NEXT_STEP: 'Nie udało się wygenerować następnego kroku',
  CREATE_SUBTASK: 'Nie udało się utworzyć kroku',
  COMPLETE_SUBTASK: 'Nie udało się oznaczyć kroku jako zrobiony'
}

export function AITaskBreakdownModal({
  open,
  onClose,
  task,
  onCreateSubtasks,
  userId
}: AITaskBreakdownModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mode-selection')
  const [selectedMode, setSelectedMode] = useState<ModeType>('light')
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null)
  
  // Progress tracking
  const [progress, setProgress] = useState<AIAssistantProgress | null>(null)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)
  
  // Questions Mode
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  
  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [currentSubtaskIndex, setCurrentSubtaskIndex] = useState(0)
  const [isCreatingSubtasks, setIsCreatingSubtasks] = useState(false)
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false)
  const [isCompletingStep, setIsCompletingStep] = useState(false)
  
  const { showToast } = useToast()
  
  const resetModal = useCallback(() => {
    setViewMode('mode-selection')
    setSelectedMode('light')
    setClarifyQuestions([])
    setCurrentQuestion(0)
    setAnswers([])
    setSubtasks([])
    setCurrentSubtaskIndex(0)
    setProgress(null)
  }, [])
  
  // Get user ID from Supabase auth
  useEffect(() => {
    const getUserId = async () => {
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }
      }
    }
    getUserId()
  }, [currentUserId])
  
  // Load existing progress when modal opens
  useEffect(() => {
    if (open && currentUserId) {
      loadProgress()
    } else {
      // Don't reset on close - keep state for next open
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUserId])
  
  // Load progress from database
  const loadProgress = async () => {
    if (!currentUserId) return
    
    setIsLoadingProgress(true)
    try {
      const existingProgress = await getProgress(currentUserId, task.id)
      
      if (existingProgress) {
        // Restore progress
        setProgress(existingProgress)
        setSelectedMode(existingProgress.mode)
        setCurrentSubtaskIndex(existingProgress.current_step_index)
        
        // Regenerate subtasks and jump directly to the current step
        const success = await regenerateSubtasksForMode(existingProgress)
        
        // Show welcome toast only after successful regeneration
        if (success) {
          showToast(`Witaj z powrotem! Ostatnio byłeś na kroku ${existingProgress.current_step_index + 1} z ${existingProgress.total_steps}`, 'info')
        }
      }
    } catch (err) {
      console.error('Error loading progress:', err)
    } finally {
      setIsLoadingProgress(false)
    }
  }

  // Mode Selection Handler
  const handleModeSelect = async (mode: ModeType) => {
    setSelectedMode(mode)
    
    if (mode === 'light') {
      // Generate subtasks immediately without questions
      await generateSubtasksForLightMode()
    } else if (mode === 'stuck') {
      // Show questions modal
      setViewMode('questions')
      await handleStartQuestions()
    } else if (mode === 'crisis') {
      // Generate 1 quick subtask ≤5 min
      await generateSubtasksForCrisisMode()
    }
  }

  // Questions Mode - Generate Questions (for stuck mode)
  const handleStartQuestions = useCallback(async () => {
    // Avoid duplicate calls
    if (isLoadingQuestions || clarifyQuestions.length > 0) return
    
    setIsLoadingQuestions(true)
    
    try {
      const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD. 

Zadanie: "${task.content}"
${task.description ? `Opis: "${task.description}"` : ''}

Wygeneruj MAKSYMALNIE 3 pytania doprecyzowujące.

PIERWSZE pytanie MUSI być ZAWSZE:
"Po czym poznasz, że to zadanie jest ZROBIONE?"

Kolejne 1-2 pytania powinny być:
- Praktyczne i konkretne
- Bezpośrednio związane z tym zadaniem
- Pomocne w określeniu pierwszego sensownego ruchu

Zwróć JSON: 
{
  "questions": ["Po czym poznasz, że to zadanie jest ZROBIONE?", "Pytanie 2?", "Pytanie 3?"]
}`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Jesteś asystentem ADHD specjalizującym się w pomocy osobom, które nie wiedzą jak zacząć.' },
            { role: 'user', content: prompt }
          ],
          jsonMode: true
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate questions')
      
      const data = await res.json()
      const parsed = JSON.parse(data.response || '{"questions":[]}')
      
      if (parsed.questions && parsed.questions.length > 0) {
        setClarifyQuestions(parsed.questions)
        setCurrentQuestion(0)
        setAnswers([])
      } else {
        throw new Error('No questions generated')
      }
    } catch (err) {
      console.error('Error generating questions:', err)
      // Fallback questions
      setClarifyQuestions([
        'Po czym poznasz, że to zadanie jest ZROBIONE?',
        'Co jest pierwszym krokiem, który możesz zrobić teraz?',
        'Czy są jakieś przeszkody, które blokują rozpoczęcie?'
      ])
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [task, isLoadingQuestions, clarifyQuestions.length])

  // Answer Question
  const handleAnswerQuestion = (answer: string) => {
    if (!answer.trim()) return
    
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)
    
    if (currentQuestion < clarifyQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Last question answered - generate ONE first step
      generateSubtasksForStuckMode(newAnswers)
    }
  }

  // Generate Subtasks for Light Mode (default)
  const generateSubtasksForLightMode = async () => {
    setIsGeneratingSubtasks(true)
    setViewMode('single-subtask')
    
    try {
      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskContent: task.content,
          taskDescription: task.description,
          mode: 'light',
          maxSubtasks: 3
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate subtasks')
      
      const data: BreakdownAPIResponse = await res.json()
      
      if (data.subtasks && data.subtasks.length > 0) {
        const generatedSubtasks: Subtask[] = data.subtasks.map((st: AISubtaskResponse, idx: number) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: st.title,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes || 15,
          isBackup: idx > 0, // First is main, rest are backups
          completed: false
        }))
        
        setSubtasks(generatedSubtasks)
        setCurrentSubtaskIndex(0)
        
        // Create progress tracking
        if (currentUserId) {
          const newProgress = await createProgress(currentUserId, task.id, 'light', generatedSubtasks.length)
          if (newProgress) {
            setProgress(newProgress)
          }
          
          // Auto-create all subtasks in database
          await autoCreateAllSubtasks(generatedSubtasks, newProgress?.id)
        }
      }
    } catch (err) {
      console.error('Error generating subtasks:', err)
      alert(ERROR_MESSAGES.LIGHT_MODE)
    } finally {
      setIsGeneratingSubtasks(false)
    }
  }

  // Generate Subtasks for Stuck Mode (after questions)
  const generateSubtasksForStuckMode = async (allAnswers: string[]) => {
    setIsGeneratingSubtasks(true)
    setViewMode('single-subtask')
    
    try {
      const qaContext = clarifyQuestions
        .map((q, i) => `Q: ${q}\nA: ${allAnswers[i]}`)
        .join('\n\n')

      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskContent: task.content,
          taskDescription: task.description,
          mode: 'stuck',
          qaContext: qaContext,
          maxSubtasks: 1
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate subtask')
      
      const data: BreakdownAPIResponse = await res.json()
      
      if (data.subtasks && data.subtasks.length > 0) {
        const generatedSubtasks: Subtask[] = data.subtasks.map((st: AISubtaskResponse, idx: number) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: st.title,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes || 15,
          completed: false
        }))
        
        setSubtasks(generatedSubtasks)
        setCurrentSubtaskIndex(0)
        
        // Create progress tracking
        if (currentUserId) {
          const newProgress = await createProgress(currentUserId, task.id, 'stuck', 1, qaContext)
          if (newProgress) {
            setProgress(newProgress)
          }
          
          // Auto-create first subtask in database
          await autoCreateAllSubtasks(generatedSubtasks, newProgress?.id)
        }
      }
    } catch (err) {
      console.error('Error generating subtask:', err)
      alert(ERROR_MESSAGES.STUCK_MODE)
    } finally {
      setIsGeneratingSubtasks(false)
    }
  }

  // Generate Subtasks for Crisis Mode
  const generateSubtasksForCrisisMode = async () => {
    setIsGeneratingSubtasks(true)
    setViewMode('single-subtask')
    
    try {
      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskContent: task.content,
          taskDescription: task.description,
          mode: 'crisis',
          maxSubtasks: 1,
          maxMinutes: 5
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate subtask')
      
      const data: BreakdownAPIResponse = await res.json()
      
      if (data.subtasks && data.subtasks.length > 0) {
        const generatedSubtasks: Subtask[] = data.subtasks.map((st: AISubtaskResponse, idx: number) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: st.title,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes || 5,
          completed: false
        }))
        
        setSubtasks(generatedSubtasks)
        setCurrentSubtaskIndex(0)
        
        // Create progress tracking
        if (currentUserId) {
          const newProgress = await createProgress(currentUserId, task.id, 'crisis', 1)
          if (newProgress) {
            setProgress(newProgress)
          }
          
          // Auto-create first subtask in database
          await autoCreateAllSubtasks(generatedSubtasks, newProgress?.id)
        }
      }
    } catch (err) {
      console.error('Error generating subtask:', err)
      alert(ERROR_MESSAGES.CRISIS_MODE)
    } finally {
      setIsGeneratingSubtasks(false)
    }
  }

  // Auto-create all subtasks in database when generated
  const autoCreateAllSubtasks = async (subtasksToCreate: Subtask[], progressId?: string) => {
    try {
      const subtasksData = subtasksToCreate.map(st => ({
        content: st.title,
        description: st.description,
        duration: st.estimatedMinutes,
        duration_unit: 'minute' as const
      }))
      
      await onCreateSubtasks(subtasksData)
      
      showToast(`Automatycznie utworzono ${subtasksToCreate.length} ${subtasksToCreate.length === 1 ? 'krok' : 'kroków'}`, 'success')
      
      // Note: We'd need to get the created subtask IDs back to store them in progress
      // For now, we'll just track that they were created
    } catch (err) {
      console.error('Error auto-creating subtasks:', err)
      showToast('Nie udało się automatycznie utworzyć kroków', 'error')
    }
  }

  /**
   * Regenerate subtasks when user returns to saved progress
   * 
   * This function calls the AI API to regenerate the step-by-step breakdown
   * based on the saved progress. It handles mode-specific parameters and
   * restores the user's position (current step and completed steps).
   * 
   * @param existingProgress - The saved progress including mode, step count, and completion status
   * @returns Promise<boolean> - true if regeneration succeeded, false if it failed
   * 
   * Behavior:
   * - For 'stuck' mode: includes Q&A context if available
   * - For 'crisis' mode: sets maxMinutes to 5
   * - For 'light' mode: uses default parameters
   * - On failure: falls back to mode selection screen and returns false
   * - On success: restores subtasks with completion status and current position, returns true
   */
  const regenerateSubtasksForMode = async (existingProgress: AIAssistantProgress): Promise<boolean> => {
    setIsGeneratingSubtasks(true)
    setViewMode('single-subtask')
    
    try {
      const requestBody: BreakdownRequestBody = {
        taskContent: task.content,
        taskDescription: task.description,
        mode: existingProgress.mode,
        maxSubtasks: existingProgress.total_steps
      }
      
      // Add mode-specific parameters
      if (existingProgress.mode === 'stuck' && existingProgress.qa_context) {
        requestBody.qaContext = existingProgress.qa_context
      } else if (existingProgress.mode === 'crisis') {
        requestBody.maxMinutes = 5
      }
      
      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error')
        throw new Error(`Failed to regenerate subtasks (HTTP ${res.status}): ${errorText}`)
      }
      
      const data: BreakdownAPIResponse = await res.json()
      
      if (data.subtasks && data.subtasks.length > 0) {
        const defaultMinutes = existingProgress.mode === 'crisis' ? 5 : 15
        const regeneratedSubtasks: Subtask[] = data.subtasks.map((st: AISubtaskResponse, idx: number) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: st.title,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes || defaultMinutes,
          completed: existingProgress.completed_step_indices.includes(idx)
        }))
        
        setSubtasks(regeneratedSubtasks)
        setCurrentSubtaskIndex(existingProgress.current_step_index)
        return true
      }
      return false
    } catch (err) {
      console.error('Error regenerating subtasks:', err)
      // Fall back to mode selection if regeneration fails
      setViewMode('mode-selection')
      return false
    } finally {
      setIsGeneratingSubtasks(false)
    }
  }

  // Handle "Done" button - mark current step as completed and advance
  const handleMarkStepDone = async () => {
    const currentSubtask = subtasks[currentSubtaskIndex]
    
    if (!currentSubtask) {
      console.error('❌ No current subtask')
      return
    }
    
    setIsCompletingStep(true)
    
    try {
      console.log(`✅ Marking step ${currentSubtaskIndex + 1} as done`)
      
      // 1. Mark subtask as completed in local state
      const updatedSubtasks = [...subtasks]
      updatedSubtasks[currentSubtaskIndex].completed = true
      setSubtasks(updatedSubtasks)
      
      // 2. Update progress in database (if progress exists)
      if (progress) {
        const updatedProgress = await completeStep(progress.id, currentSubtaskIndex, currentSubtask.subtaskId)
        if (updatedProgress) {
          setProgress(updatedProgress)
        }
      }
      
      // 3. Show toast
      showToast('✓ Krok ukończony!', 'success')
      
      // 4. ✅ AUTO-ADVANCE to next step
      if (currentSubtaskIndex < subtasks.length - 1) {
        // Not last step - advance to next
        console.log(`✅ Advancing to step ${currentSubtaskIndex + 2}`)
        setTimeout(() => {
          setCurrentSubtaskIndex(currentSubtaskIndex + 1)
        }, 500) // Small delay for UX
      } else {
        // Last step completed - show completion and close
        console.log('✅ All steps completed!')
        showToast('🎉 Wszystkie kroki ukończone!', 'success')
        
        // Close modal after 1.5 seconds
        setTimeout(() => {
          onClose()
          resetModal()
        }, 1500)
      }
    } catch (err) {
      console.error('❌ Error completing step:', err)
      showToast(ERROR_MESSAGES.COMPLETE_SUBTASK, 'error')
    } finally {
      setIsCompletingStep(false)
    }
  }

  // Handle "Close and return later" - save progress and close
  const handleSaveAndClose = () => {
    // Progress is already saved, just close
    showToast('Postęp zapisany. Możesz wrócić później!', 'info')
    onClose()
  }

  // Handle "Anuluj" (Cancel) button - save progress and close
  // Note: This has the same behavior as handleSaveAndClose (used by X button in header)
  // Progress is automatically saved after each step completion, so we just close the modal
  const handleCancel = () => {
    showToast('Postęp zapisany. Możesz wrócić później!', 'info')
    onClose()
  }

  // Generate next subtask after completing current one (for dynamic generation)
  const handleGenerateNextSubtask = async () => {
    // For light mode, show next backup if available
    if (selectedMode === 'light' && currentSubtaskIndex + 1 < subtasks.length) {
      setCurrentSubtaskIndex(currentSubtaskIndex + 1)
      return
    }
    
    // Otherwise, generate a new one
    setIsGeneratingSubtasks(true)
    
    try {
      const completedSubtasks = subtasks.slice(0, currentSubtaskIndex + 1)
      const completedContext = completedSubtasks.map(st => `${st.title} (${st.estimatedMinutes}min)`).join('; ')
      
      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskContent: task.content,
          taskDescription: task.description,
          mode: selectedMode,
          completedContext: completedContext,
          maxSubtasks: 1
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate next subtask')
      
      const data = await res.json()
      
      if (data.subtasks && data.subtasks.length > 0) {
        const newSubtask: Subtask = {
          id: `subtask-${Date.now()}`,
          title: data.subtasks[0].title,
          description: data.subtasks[0].description,
          estimatedMinutes: data.subtasks[0].estimatedMinutes || 15,
          completed: false
        }
        
        const newSubtasks = [...subtasks, newSubtask]
        setSubtasks(newSubtasks)
        setCurrentSubtaskIndex(subtasks.length)
        
        // Auto-create the new subtask
        await autoCreateAllSubtasks([newSubtask], progress?.id)
        
        // Update progress with new total
        if (progress) {
          await updateProgress(progress.id, { current_step_index: subtasks.length })
        }
      }
    } catch (err) {
      console.error('Error generating next subtask:', err)
      alert(ERROR_MESSAGES.NEXT_STEP)
    } finally {
      setIsGeneratingSubtasks(false)
    }
  }
  
  const currentSubtask = subtasks[currentSubtaskIndex]
  
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b bg-gradient-to-r from-purple-50 to-pink-50 shrink-0">
              <div className="flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="shrink-0"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Brain size={24} weight="duotone" className="text-purple-600" />
                  </div>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    🧠 Pomoc w ruszeniu z zadaniem
                  </h2>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {task.content}
                  </p>
                  
                  {/* Progress Bar */}
                  {viewMode === 'single-subtask' && subtasks.length > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-purple-700">
                          Krok {currentSubtaskIndex + 1} z {subtasks.length}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(((currentSubtaskIndex + 1) / subtasks.length) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentSubtaskIndex + 1) / subtasks.length) * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSaveAndClose}
                  className="shrink-0 w-8 h-8 rounded-lg hover:bg-gray-200 transition flex items-center justify-center"
                  title="Zamknij i wróć później"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* MODE SELECTION VIEW */}
              {viewMode === 'mode-selection' && (
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-center mb-6">
                    Jak bardzo to zadanie Cię blokuje?
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Light Mode */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleModeSelect('light')}
                      className="w-full p-5 border-2 border-green-300 rounded-xl hover:bg-green-50 transition text-left bg-white"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                          <Lightning size={24} weight="fill" className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            🟢 Lekki
                          </h4>
                          <p className="text-sm text-gray-600">
                            Po prostu chcę zacząć. Pokaż mi pierwszy sensowny krok.
                          </p>
                        </div>
                      </div>
                    </motion.button>
                    
                    {/* Stuck Mode */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleModeSelect('stuck')}
                      className="w-full p-5 border-2 border-yellow-300 rounded-xl hover:bg-yellow-50 transition text-left bg-white"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                          <Question size={24} weight="fill" className="text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            🟡 Nie wiem jak zacząć
                          </h4>
                          <p className="text-sm text-gray-600">
                            Pomóż mi doprecyzować. Odpowiem na kilka pytań.
                          </p>
                        </div>
                      </div>
                    </motion.button>
                    
                    {/* Crisis Mode */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleModeSelect('crisis')}
                      className="w-full p-5 border-2 border-red-300 rounded-xl hover:bg-red-50 transition text-left bg-white"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                          <Fire size={24} weight="fill" className="text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            🔴 Kryzys / brak energii
                          </h4>
                          <p className="text-sm text-gray-600">
                            Pokaż mi najłatwiejszy pierwszy ruch (≤5 min).
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </div>
              )}
              
              {/* QUESTIONS VIEW */}
              {viewMode === 'questions' && (
                <div className="p-6 space-y-4">
                  {isLoadingQuestions && clarifyQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4"
                      >
                        <Sparkle size={32} className="text-purple-600" weight="duotone" />
                      </motion.div>
                      <h3 className="font-semibold text-lg">Przygotowuję pytania...</h3>
                      <p className="text-sm text-gray-600">AI analizuje zadanie</p>
                    </div>
                  ) : (
                    <>
                      {/* Progress */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-lg">Doprecyzowanie zadania</h3>
                          <div className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-sm font-medium">
                            {currentQuestion + 1} / {clarifyQuestions.length}
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentQuestion + 1) / clarifyQuestions.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                      
                      {/* Questions */}
                      <div className="space-y-3">
                        {clarifyQuestions.map((question, idx) => {
                          const isAnswered = !!answers[idx]
                          const isCurrent = idx === currentQuestion && !isAnswered
                          
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                            >
                              {isAnswered ? (
                                // Answered Question
                                <div className="bg-green-50/50 border-2 border-green-200 rounded-xl overflow-hidden">
                                  <div className="px-4 py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                      <Check size={16} className="text-green-600" weight="bold" />
                                    </div>
                                    <p className="flex-1 font-medium text-gray-900">{question}</p>
                                  </div>
                                  <div className="px-4 pb-3 pl-15">
                                    <div className="bg-white p-3 rounded-lg border border-green-200">
                                      <p className="text-sm text-gray-700">{answers[idx]}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : isCurrent ? (
                                // Current Question
                                <div className="border-2 border-purple-500 rounded-xl p-4 bg-white shadow-lg">
                                  <div className="flex items-start gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                      <span className="text-sm font-bold text-purple-600">{idx + 1}</span>
                                    </div>
                                    <p className="flex-1 font-medium text-gray-900 pt-1">{question}</p>
                                  </div>
                                  
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-3"
                                  >
                                    <textarea
                                      id={`answer-${idx}`}
                                      placeholder="Twoja odpowiedź..."
                                      className="w-full min-h-[100px] px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          const textarea = document.getElementById(`answer-${idx}`) as HTMLTextAreaElement
                                          handleAnswerQuestion(textarea?.value || '')
                                        }}
                                        disabled={isGeneratingSubtasks}
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                                      >
                                        {isGeneratingSubtasks ? (
                                          <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                          >
                                            <Sparkle size={16} />
                                          </motion.div>
                                        ) : idx === clarifyQuestions.length - 1 ? (
                                          <>
                                            <Sparkle size={16} />
                                            Dalej
                                          </>
                                        ) : (
                                          <>
                                            Następne
                                            <ArrowRight size={16} />
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </motion.div>
                                </div>
                              ) : (
                                // Future Question
                                <div className="border-2 border-gray-200 rounded-xl p-4 opacity-50">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                      <span className="text-sm font-bold text-gray-400">{idx + 1}</span>
                                    </div>
                                    <p className="flex-1 text-gray-600 pt-1">{question}</p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* SINGLE SUBTASK VIEW */}
              {viewMode === 'single-subtask' && (
                <div className="p-6 space-y-4">
                  {isGeneratingSubtasks ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6"
                      >
                        <Sparkle size={40} className="text-purple-600" weight="duotone" />
                      </motion.div>
                      <h3 className="font-semibold text-lg mb-2">Analizuję zadanie...</h3>
                      <p className="text-sm text-gray-600">AI przygotowuje kroki do wykonania</p>
                    </div>
                  ) : currentSubtask ? (
                    <>
                      {/* Crisis Mode Message */}
                      {selectedMode === 'crisis' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                        >
                          <p className="text-sm text-red-900 text-center font-medium">
                            💪 To tylko pierwszy ruch. Reszta nie ma teraz znaczenia.
                          </p>
                        </motion.div>
                      )}
                      
                      {/* Completed Steps (if any) */}
                      {currentSubtaskIndex > 0 && (
                        <div className="space-y-2 mb-4">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Ukończone kroki:</h4>
                          {subtasks.slice(0, currentSubtaskIndex).map((subtask, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-green-50 border border-green-200 rounded-lg p-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                                  <Check size={14} className="text-white" weight="bold" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700 line-through">{subtask.title}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                      
                      {/* Current Subtask Card */}
                      <motion.div
                        key={currentSubtaskIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="border-2 border-purple-300 rounded-xl p-6 bg-gradient-to-br from-purple-50 to-pink-50"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-lg">{currentSubtaskIndex + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-gray-900 mb-2">
                              {currentSubtask.title}
                            </h3>
                            <p className="text-gray-700 leading-relaxed mb-3">
                              {currentSubtask.description}
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-purple-200">
                              <Clock size={16} className="text-purple-600" />
                              <span className="text-sm font-medium text-gray-700">
                                ~{currentSubtask.estimatedMinutes} min
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                      
                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleSaveAndClose}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium text-gray-700"
                        >
                          Zamknij
                        </button>
                        <button
                          onClick={handleMarkStepDone}
                          disabled={isCompletingStep}
                          className="flex-[2] px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 font-semibold shadow-lg flex items-center justify-center gap-2"
                        >
                          {isCompletingStep ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Sparkle size={18} />
                              </motion.div>
                              Zapisuję...
                            </>
                          ) : (
                            <>
                              <Check size={18} weight="bold" />
                              Zrobione
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
