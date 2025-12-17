'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ArrowDown, ArrowUp, XCircle, CheckCircle, ArrowsClockwise } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  DayTask,
  EnergyMode,
  DetailLevel,
  DETAIL_LEVEL_DESCRIPTIONS
} from '@/lib/types/dayAssistant'
import { apiPost } from '@/lib/api'

interface SubtaskModalProps {
  task: DayTask
  energyMode: EnergyMode
  userId: string
  onClose: () => void
  onGenerated: () => void
}

interface GeneratedSubtask {
  content: string
  estimated_duration: number
}

/**
 * Modal for generating and managing subtasks with AI
 */
export function SubtaskModal({
  task,
  energyMode,
  userId,
  onClose,
  onGenerated
}: SubtaskModalProps) {
  const { showToast } = useToast()
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard')
  const [generatedSubtasks, setGeneratedSubtasks] = useState<GeneratedSubtask[]>([])
  const [loading, setLoading] = useState(false)
  const [showFeedbackButtons, setShowFeedbackButtons] = useState(false)
  const [showClarificationDialog, setShowClarificationDialog] = useState(false)
  const [clarification, setClarification] = useState({
    goal: task.title || '',
    blocker: '',
    doneCriteria: ''
  })

  const handleGenerate = async (withClarification = false) => {
    setLoading(true)
    try {
      // Build enhanced prompt with clarification if provided
      let enhancedDescription = task.description || ''
      
      if (withClarification && (clarification.blocker || clarification.doneCriteria)) {
        enhancedDescription = `
${task.description || ''}

DOPRECYZOWANIE UŻYTKOWNIKA:
- Dokładny cel: ${clarification.goal}
${clarification.blocker ? `- Główny bloker: ${clarification.blocker}` : ''}
${clarification.doneCriteria ? `- Kryteria ukończenia: ${clarification.doneCriteria}` : ''}
        `.trim()
      }

      const response = await apiPost('/api/day-assistant/subtasks/generate', {
        task_id: task.id,
        task_title: task.title,
        task_description: enhancedDescription,
        detail_level: detailLevel,
        energy_mode: energyMode
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedSubtasks(data.subtasks || [])
        setShowFeedbackButtons(true)
        setShowClarificationDialog(false)
        showToast('Kroki wygenerowane!', 'success')
      } else {
        throw new Error('Failed to generate subtasks')
      }
    } catch (error) {
      console.error('Error generating subtasks:', error)
      showToast('Błąd podczas generowania kroków', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (feedback: 'ok' | 'simplify' | 'split_more' | 'regenerate' | 'clarify', startTimer = false) => {
    try {
      // Record feedback (except for clarify which is a navigation action)
      if (feedback !== 'clarify') {
        // Map 'regenerate' to 'nonsense' for API compatibility - both mean "try again with different approach"
        const apiCompatibleFeedback = feedback === 'regenerate' ? 'nonsense' : feedback
        await apiPost('/api/day-assistant/subtasks/feedback', {
          task_id: task.id,
          feedback_type: apiCompatibleFeedback,
          feedback_stage: 'pre_completion',
          detail_level: detailLevel
        })
      }

      if (feedback === 'ok') {
        // Accept and create subtasks
        const response = await apiPost('/api/day-assistant/subtasks', {
          task_id: task.id,
          subtasks: generatedSubtasks
        })

        if (response.ok) {
          showToast('Kroki zapisane!', 'success')
          
          // Start timer if requested
          if (startTimer && typeof window !== 'undefined') {
            const timerState = {
              taskId: task.id,
              taskTitle: task.title,
              startTime: Date.now(),
              elapsedSeconds: 0,
              isRunning: true,
              isPaused: false
            }
            localStorage.setItem('taskTimer', JSON.stringify(timerState))
            window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: timerState }))
            showToast('⏱️ Timer started!', 'success')
          }
          
          onGenerated()
          onClose()
        }
      } else if (feedback === 'simplify') {
        // Regenerate with lower detail level
        const newLevel: DetailLevel = detailLevel === 'detailed' ? 'standard' : 'minimum'
        setDetailLevel(newLevel)
        showToast('Tworzę mniej kroków...', 'info')
        setTimeout(() => handleGenerate(), 500)
      } else if (feedback === 'split_more') {
        // Regenerate with higher detail level
        const newLevel: DetailLevel = detailLevel === 'minimum' ? 'standard' : 'detailed'
        setDetailLevel(newLevel)
        showToast('Dzielę na więcej kroków...', 'info')
        setTimeout(() => handleGenerate(), 500)
      } else if (feedback === 'regenerate') {
        // Regenerate with different approach (same detail level)
        showToast('Spróbuję ponownie...', 'info')
        setTimeout(() => handleGenerate(), 500)
      } else if (feedback === 'clarify') {
        // Show clarification dialog
        setShowClarificationDialog(true)
        setShowFeedbackButtons(false)
      }
    } catch (error) {
      console.error('Error handling feedback:', error)
      showToast('Błąd podczas przetwarzania odpowiedzi', 'error')
    }
  }

  const totalDuration = generatedSubtasks.reduce((sum, s) => sum + s.estimated_duration, 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generuj kroki dla zadania</DialogTitle>
          <DialogDescription>
            {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Detail Level Selector */}
          {!showFeedbackButtons && (
            <div>
              <label className="block text-sm font-medium mb-3">
                Poziom szczegółowości
              </label>
              <div className="flex gap-2">
                {(['minimum', 'standard', 'detailed'] as DetailLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDetailLevel(level)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      detailLevel === level
                        ? 'border-brand-purple bg-brand-purple/10 text-brand-purple font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {DETAIL_LEVEL_DESCRIPTIONS[level]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generated Subtasks */}
          {generatedSubtasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Wygenerowane kroki:</h3>
              {generatedSubtasks.map((subtask, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg flex items-start gap-3 transition-all',
                    index === 0 
                      ? 'bg-brand-purple/10 border-2 border-brand-purple shadow-md' 
                      : 'bg-gray-50 opacity-70'
                  )}
                >
                  <Badge 
                    variant={index === 0 ? 'default' : 'outline'} 
                    className={cn(
                      'shrink-0',
                      index === 0 && 'bg-brand-purple text-white'
                    )}
                  >
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    {index === 0 && (
                      <div className="text-xs font-semibold text-brand-purple mb-1 uppercase tracking-wide">
                        ⭐ Teraz - Zaczynaj od tego
                      </div>
                    )}
                    <p className={cn(
                      'font-medium',
                      index === 0 && 'text-lg'
                    )}>
                      {subtask.content}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ⏱️ {subtask.estimated_duration} min
                    </p>
                  </div>
                </div>
              ))}
              <div className="text-sm text-muted-foreground text-right">
                Łączny czas: <strong>{totalDuration} min</strong>
              </div>
            </div>
          )}

          {/* Clarification Dialog */}
          {showClarificationDialog && (
            <div className="space-y-4 border-2 border-brand-purple rounded-lg p-4 bg-brand-purple/5">
              <h3 className="font-semibold text-lg">💭 Doprecyzuj zadanie: &ldquo;{task.title}&rdquo;</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    1️⃣ O co dokładnie chodzi w tym zadaniu?
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                    value={clarification.goal}
                    onChange={(e) => setClarification({ ...clarification, goal: e.target.value })}
                    placeholder="np. Zalogować się i sprawdzić..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    2️⃣ Co Cię najbardziej blokuje?
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                    value={clarification.blocker}
                    onChange={(e) => setClarification({ ...clarification, blocker: e.target.value })}
                    placeholder="np. Nie pamiętam hasła"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    3️⃣ Kiedy uznamy, że zadanie jest skończone?
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                    value={clarification.doneCriteria}
                    onChange={(e) => setClarification({ ...clarification, doneCriteria: e.target.value })}
                    placeholder="np. Gdy potwierdzę, że projekt..."
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowClarificationDialog(false)
                    setShowFeedbackButtons(true)
                  }}
                >
                  ❌ Anuluj
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleGenerate(true)}
                  disabled={loading}
                >
                  {loading ? 'Generuję...' : '🔄 Generuj kroki z tymi informacjami'}
                </Button>
              </div>
            </div>
          )}

          {/* Feedback Buttons */}
          {showFeedbackButtons && !showClarificationDialog && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Co myślisz o tych krokach?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleFeedback('ok', true)}
                  variant="default"
                  className="w-full bg-brand-purple hover:bg-brand-purple/90"
                >
                  <CheckCircle size={20} className="mr-2" />
                  ✅ OK, START + ⏱️
                </Button>
                <Button
                  onClick={() => handleFeedback('regenerate')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowsClockwise size={20} className="mr-2" />
                  🔄 Spróbuj ponownie
                </Button>
                <Button
                  onClick={() => handleFeedback('split_more')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowUp size={20} className="mr-2" />
                  ➕ Więcej kroków
                </Button>
                <Button
                  onClick={() => handleFeedback('simplify')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowDown size={20} className="mr-2" />
                  ➖ Mniej kroków
                </Button>
                <Button
                  onClick={() => handleFeedback('clarify')}
                  variant="outline"
                  className="w-full col-span-2"
                >
                  ✏️ Doprecyzuj zadanie
                </Button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          {!showFeedbackButtons && (
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Anuluj
              </Button>
              <Button onClick={() => handleGenerate(false)} disabled={loading}>
                {loading ? 'Generuję...' : '🧠 Generuj kroki'}
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
