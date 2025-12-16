'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { apiPost } from '@/lib/api'

interface CreateTaskModalProps {
  userId: string
  onClose: () => void
  onCreated: () => void
}

/**
 * Modal for creating a new task
 */
export function CreateTaskModal({ userId, onClose, onCreated }: CreateTaskModalProps) {
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState(15)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showToast('Tytuł zadania jest wymagany', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await apiPost('/api/day-assistant/tasks', {
        userId,
        task: {
          title: title.trim(),
          description: description.trim() || undefined,
          estimated_duration: estimatedDuration,
          priority: 'later'
        }
      })

      if (response.ok) {
        showToast('Zadanie utworzone!', 'success')
        onCreated()
        onClose()
      } else {
        throw new Error('Failed to create task')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      showToast('Błąd podczas tworzenia zadania', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj nowe zadanie</DialogTitle>
          <DialogDescription>
            Utwórz nowe zadanie dla asystenta dnia
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tytuł zadania *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Napisać raport z projektu"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Opis (opcjonalnie)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe szczegóły..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Szacowany czas (min)
            </label>
            <Input
              type="number"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 15)}
              min={5}
              max={120}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Tworzenie...' : 'Dodaj zadanie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
