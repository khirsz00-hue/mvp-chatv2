'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { Clock } from '@phosphor-icons/react'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTask: (task: any) => Promise<void>
}

export function CreateTaskModal({ open, onOpenChange, onCreateTask }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'1' | '2' | '3' | '4'>('4')
  const [estimation, setEstimation] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async () => {
    if (!title. trim()) {
      alert('Tytuł zadania jest wymagany')
      return
    }
    
    setLoading(true)
    try {
      await onCreateTask({
        content: title,
        description:  description. trim() || undefined,
        due_date: dueDate || undefined,
        priority:  parseInt(priority),
        estimationMinutes: estimation ? parseInt(estimation) : undefined
      })
      
      // Reset form
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('4')
      setEstimation('')
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Nie udało się utworzyć zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const handleClose = () => {
    if (! loading) {
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('4')
      setEstimation('')
      onOpenChange(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nowe zadanie</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Tytuł */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tytuł zadania <span className="text-red-500">*</span>
            </label>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co chcesz zrobić?"
              autoFocus
              disabled={loading}
            />
          </div>
          
          {/* Opis */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Opis (opcjonalnie)
            </label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe szczegóły, notatki..."
              rows={4}
              disabled={loading}
            />
          </div>
          
          {/* Termin + Priorytet */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Termin</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Priorytet</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                disabled={loading}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="1">🔴 Wysoki (P1)</option>
                <option value="2">🟠 Średni (P2)</option>
                <option value="3">🔵 Niski (P3)</option>
                <option value="4">⚪ Brak (P4)</option>
              </select>
            </div>
          </div>
          
          {/* Estymacja */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Estymacja czasu (minuty)
            </label>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-muted-foreground" />
              <Input 
                type="number"
                value={estimation}
                onChange={(e) => setEstimation(e.target.value)}
                placeholder="np. 30"
                min="1"
                disabled={loading}
                className="flex-1"
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="ghost" 
            onClick={handleClose}
            disabled={loading}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={! title.trim() || loading}
          >
            {loading ? 'Tworzenie...' : 'Utwórz zadanie'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
