'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import { TestDayTask } from '@/lib/types/dayAssistantV2'
import { useToast } from '@/components/ui/Toast'

interface Props {
  task: TestDayTask
  onClose: () => void
  onSubmit: () => void
  sessionToken: string | null
}

export function ClarifyModal({ task, onClose, onSubmit, sessionToken }: Props) {
  const [userContext, setUserContext] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleClarify = async () => {
    if (!sessionToken) {
      showToast('Brak autoryzacji', 'error')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/day-assistant-v2/suggest-first-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          task_id: task.id,
          title: task.title,
          description: task.description,
          user_context: userContext
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate first step')
      }

      const { first_step } = await response.json()
      setAiSuggestion(first_step)
    } catch (error) {
      console.error('Error generating first step:', error)
      showToast('Błąd generowania kroku', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!sessionToken || !aiSuggestion) return

    try {
      // Create subtask
      const response = await fetch('/api/day-assistant-v2/subtasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          task_id: task.id,
          content: aiSuggestion,
          estimated_duration: 15 // 10-15 min
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create subtask')
      }

      onSubmit()
      onClose()
    } catch (error) {
      console.error('Error creating subtask:', error)
      showToast('Błąd tworzenia kroku', 'error')
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>🎯 Zrób pierwszy krok</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>

        {!aiSuggestion ? (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Co chcesz osiągnąć w pierwszym kroku?
              </label>
              <Textarea 
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="Opcjonalnie opisz kontekst lub zostaw puste, aby AI zaproponowało krok..."
                rows={4}
                className="mt-2"
              />
            </div>
            
            <Button 
              onClick={handleClarify} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generuję...' : '✨ Doprecyzuj z AI'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="font-semibold mb-2">💡 Proponowany pierwszy krok:</p>
              <p className="text-lg">{aiSuggestion}</p>
              <p className="text-sm text-gray-600 mt-2">
                ⏱️ Czas: 10-15 minut
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAccept} className="flex-1">
                ✅ Akceptuj
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setAiSuggestion(null)}
                className="flex-1"
              >
                ↩️ Spróbuj ponownie
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
