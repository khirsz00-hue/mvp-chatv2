'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ArrowDown, ArrowUp, XCircle, CheckCircle } from '@phosphor-icons/react'
import {
  DayTask,
  EnergyMode,
  DetailLevel,
  DETAIL_LEVEL_DESCRIPTIONS
} from '@/lib/types/dayAssistant'

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

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/day-assistant/subtasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          task_title: task.title,
          task_description: task.description,
          detail_level: detailLevel,
          energy_mode: energyMode
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedSubtasks(data.subtasks || [])
        setShowFeedbackButtons(true)
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

  const handleFeedback = async (feedback: 'ok' | 'simplify' | 'split_more' | 'nonsense') => {
    try {
      // Record feedback
      await fetch('/api/day-assistant/subtasks/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          feedback_type: feedback,
          feedback_stage: 'pre_completion',
          detail_level: detailLevel
        })
      })

      if (feedback === 'ok') {
        // Accept and create subtasks
        const response = await fetch('/api/day-assistant/subtasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: task.id,
            subtasks: generatedSubtasks
          })
        })

        if (response.ok) {
          showToast('Kroki zapisane!', 'success')
          onGenerated()
          onClose()
        }
      } else if (feedback === 'simplify') {
        // Regenerate with lower detail level
        const newLevel: DetailLevel = detailLevel === 'detailed' ? 'standard' : 'minimum'
        setDetailLevel(newLevel)
        showToast('Upraszczam...', 'info')
        setTimeout(() => handleGenerate(), 500)
      } else if (feedback === 'split_more') {
        // Regenerate with higher detail level
        const newLevel: DetailLevel = detailLevel === 'minimum' ? 'standard' : 'detailed'
        setDetailLevel(newLevel)
        showToast('Dzielę na więcej kroków...', 'info')
        setTimeout(() => handleGenerate(), 500)
      } else if (feedback === 'nonsense') {
        // Regenerate with different approach
        showToast('Regeneruję innym stylem...', 'info')
        setTimeout(() => handleGenerate(), 500)
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
                  className="p-4 bg-gray-50 rounded-lg flex items-start gap-3"
                >
                  <Badge variant="default" className="shrink-0">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{subtask.content}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Szacowany czas: {subtask.estimated_duration} min
                    </p>
                  </div>
                </div>
              ))}
              <div className="text-sm text-muted-foreground text-right">
                Łączny czas: <strong>{totalDuration} min</strong>
              </div>
            </div>
          )}

          {/* Feedback Buttons */}
          {showFeedbackButtons && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Co myślisz o tych krokach?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleFeedback('ok')}
                  variant="default"
                  className="w-full"
                >
                  <CheckCircle size={20} className="mr-2" />
                  ✅ OK, START
                </Button>
                <Button
                  onClick={() => handleFeedback('simplify')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowDown size={20} className="mr-2" />
                  ⬇️ Uprość krok
                </Button>
                <Button
                  onClick={() => handleFeedback('split_more')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowUp size={20} className="mr-2" />
                  ⬆️ Podziel na więcej
                </Button>
                <Button
                  onClick={() => handleFeedback('nonsense')}
                  variant="outline"
                  className="w-full"
                >
                  <XCircle size={20} className="mr-2" />
                  ❌ Bez sensu
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
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generuję...' : '🧠 Generuj kroki'}
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
