'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import Separator from '@/components/ui/Separator'
import { CheckCircle, Trash, Pencil, CalendarBlank } from '@phosphor-icons/react'

interface Task {
  id: string
  content: string
  description?: string
  project_id?: string
  priority:  1 | 2 | 3 | 4
  due?: { date: string } | string
  completed?: boolean
  created_at?: string
}

interface TaskDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onUpdate?:  (taskId: string, updates: Partial<Task>) => Promise<void>
  onDelete:  (taskId: string) => Promise<void>
  onComplete:  (taskId: string) => Promise<void>
}

export function TaskDetailsModal({ 
  open, 
  onOpenChange, 
  task, 
  onUpdate,
  onDelete,
  onComplete
}: TaskDetailsModalProps) {
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (task) {
      setEditedTitle(task.content || '')
      setEditedDescription(task.description || '')
    }
  }, [task])
  
  if (!task) return null
  
  const handleSave = async () => {
    if (!onUpdate) {
      setIsEditing(false)
      return
    }
    
    setLoading(true)
    try {
      await onUpdate(task.id, {
        content: editedTitle,
        description:  editedDescription
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating task:', err)
      alert('Nie udało się zaktualizować zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return
    
    setLoading(true)
    try {
      await onDelete(task.id)
      onOpenChange(false)
    } catch (err) {
      console.error('Error deleting task:', err)
      alert('Nie udało się usunąć zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const handleComplete = async () => {
    setLoading(true)
    try {
      await onComplete(task.id)
      onOpenChange(false)
    } catch (err) {
      console.error('Error completing task:', err)
      alert('Nie udało się ukończyć zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const dueStr = typeof task.due === 'string' ? task.due : task.due?.date
  
  const priorityLabels = {
    1: 'Wysoki',
    2: 'Średni',
    3: 'Niski',
    4: 'Brak'
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            {isEditing ? (
              <Input 
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target. value)}
                className="text-xl font-semibold"
                disabled={loading}
              />
            ) : (
              <DialogTitle className="text-2xl">{task.content}</DialogTitle>
            )}
            
            <div className="flex gap-2">
              {! isEditing && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  <Pencil size={18} />
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash size={18} />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex gap-2 flex-wrap">
            {dueStr && (
              <Badge variant="outline" className="gap-1">
                <CalendarBlank size={14} />
                {dueStr}
              </Badge>
            )}
            {task.priority && (
              <Badge variant={task.priority === 1 ?  'destructive' : 'secondary'}>
                P{task.priority} - {priorityLabels[task. priority]}
              </Badge>
            )}
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-semibold mb-2">Opis</h3>
            {isEditing ? (
              <Textarea 
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target. value)}
                rows={6}
                placeholder="Dodaj opis zadania..."
                disabled={loading}
              />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {task.description || 'Brak opisu'}
              </p>
            )}
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center gap-3">
            <Button 
              onClick={handleComplete}
              variant="success"
              className="gap-2"
              disabled={loading}
            >
              <CheckCircle size={18} />
              Ukończ zadanie
            </Button>
            
            {isEditing && (
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsEditing(false)
                    setEditedTitle(task.content)
                    setEditedDescription(task. description || '')
                  }}
                  disabled={loading}
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={loading || !editedTitle.trim()}
                >
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
