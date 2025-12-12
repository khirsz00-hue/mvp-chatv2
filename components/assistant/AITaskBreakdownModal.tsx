'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { Brain, Sparkle, CheckSquare, Square, Clock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface SubtaskSuggestion {
  title: string
  description: string
  estimatedMinutes: number
  selected: boolean
}

interface Task {
  id: string
  content: string
  description?: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
}

interface AITaskBreakdownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onCreateSubtasks: (subtasks: { title: string; description: string; estimatedMinutes: number }[]) => Promise<void>
}

export function AITaskBreakdownModal({
  open,
  onOpenChange,
  task,
  onCreateSubtasks
}: AITaskBreakdownModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedTitle, setEditedTitle] = useState('')
  
  // Generate breakdown when modal opens
  useEffect(() => {
    if (open && task) {
      generateBreakdown()
    } else {
      // Reset state when closing
      setSuggestions([])
      setError(null)
      setEditingIndex(null)
    }
  }, [open, task])
  
  const generateBreakdown = async () => {
    if (!task) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskContent: task.content + (task.description ? ` - ${task.description}` : '')
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate breakdown')
      }
      
      const data = await response.json()
      
      if (!data.steps || !Array.isArray(data.steps)) {
        throw new Error('Invalid response format')
      }
      
      // Add selected: true by default
      setSuggestions(data.steps.map((step: any) => ({
        ...step,
        selected: true
      })))
    } catch (err: any) {
      console.error('Error generating breakdown:', err)
      setError(err.message || 'Nie udało się wygenerować dekompozycji')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleSelection = (index: number) => {
    setSuggestions(prev => prev.map((s, i) => 
      i === index ? { ...s, selected: !s.selected } : s
    ))
  }
  
  const startEditing = (index: number) => {
    setEditingIndex(index)
    setEditedTitle(suggestions[index].title)
  }
  
  const saveEdit = () => {
    if (editingIndex !== null) {
      setSuggestions(prev => prev.map((s, i) => 
        i === editingIndex ? { ...s, title: editedTitle } : s
      ))
      setEditingIndex(null)
      setEditedTitle('')
    }
  }
  
  const handleCreate = async () => {
    const selectedSubtasks = suggestions.filter(s => s.selected).map(s => ({
      title: s.title,
      description: s.description,
      estimatedMinutes: s.estimatedMinutes
    }))
    
    if (selectedSubtasks.length === 0) {
      setError('Wybierz przynajmniej jeden krok')
      return
    }
    
    try {
      await onCreateSubtasks(selectedSubtasks)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error creating subtasks:', err)
      setError(err.message || 'Nie udało się utworzyć podzadań')
    }
  }
  
  const selectedCount = suggestions.filter(s => s.selected).length
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain size={24} className="text-brand-purple" weight="fill" />
            <span>🤖 AI Breakdown: {task?.content}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600">Generuję kroki zadania...</p>
              <p className="text-sm text-gray-400 mt-2">To może potrwać kilka sekund</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
              <Button
                onClick={generateBreakdown}
                size="sm"
                variant="outline"
                className="mt-2"
              >
                Spróbuj ponownie
              </Button>
            </div>
          )}
          
          {!loading && suggestions.length > 0 && (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Sparkle size={16} weight="fill" className="text-blue-600" />
                  Wybierz kroki, które chcesz dodać jako podzadania. Możesz edytować tytuły.
                </p>
              </div>
              
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={cn(
                      'border rounded-lg p-4 transition-all',
                      suggestion.selected 
                        ? 'border-brand-purple bg-purple-50/30' 
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelection(index)}
                        className="mt-1 flex-shrink-0 transition-transform hover:scale-110"
                      >
                        {suggestion.selected ? (
                          <CheckSquare size={22} weight="fill" className="text-brand-purple" />
                        ) : (
                          <Square size={22} weight="bold" className="text-gray-400" />
                        )}
                      </button>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {editingIndex === index ? (
                          <div className="flex gap-2 mb-2">
                            <Input
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit()
                                if (e.key === 'Escape') setEditingIndex(null)
                              }}
                              autoFocus
                              className="flex-1"
                            />
                            <Button size="sm" onClick={saveEdit}>
                              Zapisz
                            </Button>
                          </div>
                        ) : (
                          <h4 
                            className="font-semibold text-gray-900 mb-2 cursor-pointer hover:text-brand-purple"
                            onClick={() => startEditing(index)}
                          >
                            {suggestion.title}
                          </h4>
                        )}
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {suggestion.description}
                        </p>
                        
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Clock size={12} />
                          {suggestion.estimatedMinutes} min
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {!loading && suggestions.length > 0 && (
          <DialogFooter className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Wybrano: {selectedCount} {selectedCount === 1 ? 'krok' : 'kroków'}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleCreate}
                variant="default"
                disabled={selectedCount === 0}
                className="gap-2"
              >
                <CheckSquare size={18} weight="fill" />
                Utwórz {selectedCount} {selectedCount === 1 ? 'podzadanie' : 'podzadań'}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
