'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  description?: string | null | undefined
}

interface Step {
  title: string
  estimated_minutes: number
  order: number
}

interface Props {
  task: Task
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function HelpMeModal({ task, open, onClose, onSuccess }: Props) {
  const [stage, setStage] = useState<'questions' | 'review'>('questions')
  const [loading, setLoading] = useState(false)
  
  // Questions
  const [whatToDo, setWhatToDo] = useState('')
  const [completionCriteria, setCompletionCriteria] = useState('')
  const [blockers, setBlockers] = useState('')
  
  // Generated steps
  const [steps, setSteps] = useState<Step[]>([])

  const handleGenerateSteps = async () => {
    if (!whatToDo.trim() || !completionCriteria.trim()) {
      toast.error('Wypełnij pierwsze dwa pola')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/day-assistant-v2/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          task_title: task.title,
          what_to_do: whatToDo,
          completion_criteria: completionCriteria,
          blockers: blockers || null
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Show specific error message from API
        const errorMessage = data.error || 'Nie udało się wygenerować kroków'
        throw new Error(errorMessage)
      }
      
      // Show warning if fallback steps were used (only on success)
      if (data.warning) {
        toast.warning(data.warning)
      }

      if (!data.steps || data.steps.length === 0) {
        throw new Error('AI nie wygenerował żadnych kroków')
      }

      setSteps(data.steps)
      setStage('review')
      
      console.log('✅ [HelpMeModal] Generated', data.steps.length, 'steps')
    } catch (error) {
      console.error('❌ [HelpMeModal] Error:', error)
      
      // Show specific error message
      const errorMessage = error instanceof Error ? error.message : 'Nie udało się wygenerować kroków'
      toast.error(`❌ ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptSteps = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/day-assistant-v2/subtasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          steps: steps.map((step, i) => ({
            content: step.title,
            estimated_duration: step.estimated_minutes,
            position: i + 1
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to create subtasks')

      toast.success('✅ Kroki utworzone!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('[HelpMeModal] Error creating subtasks:', error)
      toast.error('Nie udało się utworzyć kroków')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setStage('questions')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>⚡ Pomóż mi rozpocząć</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 mb-4">
          Zadanie: <strong>{task.title}</strong>
        </p>

        {stage === 'questions' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="what_to_do">
                1. Na czym dokładnie polega zadanie? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="what_to_do"
                placeholder="Opisz co dokładnie trzeba zrobić..."
                value={whatToDo}
                onChange={(e) => setWhatToDo(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="completion_criteria">
                2. Po czym poznasz że jest zakończone? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="completion_criteria"
                placeholder="Jakie są kryteria ukończenia..."
                value={completionCriteria}
                onChange={(e) => setCompletionCriteria(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="blockers">
                3. Co Cię blokuje?
              </Label>
              <Textarea
                id="blockers"
                placeholder="Co może Cię blokować lub od czego zależy to zadanie..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                rows={2}
                className="mt-2"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>
                ❌ Anuluj
              </Button>
              <Button onClick={handleGenerateSteps} disabled={loading}>
                {loading ? (
                  <>
                    <ArrowsClockwise size={16} className="mr-2 animate-spin" />
                    Generuję...
                  </>
                ) : (
                  '✨ Wygeneruj kroki'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">💡 AI zaproponował {steps.length} kroków:</h3>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox checked={false} disabled={true} className="mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {step.order}. {step.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        ~{step.estimated_minutes} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleEdit}>
                ↩️ Edytuj
              </Button>
              <Button onClick={handleAcceptSteps} disabled={loading}>
                {loading ? (
                  <>
                    <ArrowsClockwise size={16} className="mr-2 animate-spin" />
                    Tworzę...
                  </>
                ) : (
                  '✅ Akceptuj kroki'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
