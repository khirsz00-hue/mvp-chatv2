'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { Lightning, Brain, Envelope, ChatCircle, Calendar, Tag } from '@phosphor-icons/react'
import { TaskContext } from '@/lib/services/contextInferenceService'
import { AISuggestionBadge } from './AISuggestionBadge'
import { analyzeTaskPatterns, suggestEstimate, EstimateSuggestion, TaskPattern } from '@/lib/taskLearning'
import { supabase } from '@/lib/supabaseClient'

export interface NewTaskData {
  title: string
  description: string
  estimateMin: number
  cognitiveLoad: number
  contextType: TaskContext
  priority: number
  dueDate: string
  tags: string[]
  isMust: boolean
  isImportant: boolean
}

interface NewTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (task: NewTaskData) => void
  defaultDate?: string
}

export function NewTaskModal({ isOpen, onClose, onSubmit, defaultDate }: NewTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimateMin, setEstimateMin] = useState(25)
  const [cognitiveLoad, setCognitiveLoad] = useState(3)
  const [contextType, setContextType] = useState<TaskContext>('deep_work')
  const [priority, setPriority] = useState(3)
  const [dueDate, setDueDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [tagsInput, setTagsInput] = useState('')
  const [isMust, setIsMust] = useState(false)
  const [isImportant, setIsImportant] = useState(false)
  const [patterns, setPatterns] = useState<TaskPattern[]>([])
  const [aiSuggestion, setAiSuggestion] = useState<EstimateSuggestion | null>(null)
  const [patternsLoaded, setPatternsLoaded] = useState(false)

  // Load task patterns once when component mounts (not on every modal open)
  useEffect(() => {
    if (!patternsLoaded) {
      loadPatterns()
    }
  }, [patternsLoaded])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setEstimateMin(25)
      setCognitiveLoad(3)
      setContextType('deep_work')
      setPriority(3)
      setDueDate(defaultDate || new Date().toISOString().split('T')[0])
      setTagsInput('')
      setIsMust(false)
      setIsImportant(false)
      setAiSuggestion(null)
    }
  }, [isOpen, defaultDate])
  
  // Update AI suggestion when estimate, context or cognitive load changes
  useEffect(() => {
    if (patterns.length > 0) {
      const suggestion = suggestEstimate(
        { context_type: contextType, cognitive_load: cognitiveLoad, estimate_min: estimateMin },
        patterns
      )
      setAiSuggestion(suggestion)
    }
  }, [estimateMin, contextType, cognitiveLoad, patterns])
  
  const loadPatterns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const taskPatterns = await analyzeTaskPatterns(user.id)
        setPatterns(taskPatterns)
        setPatternsLoaded(true)
      }
    } catch (error) {
      console.error('Failed to load task patterns:', error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      estimateMin,
      cognitiveLoad,
      contextType,
      priority,
      dueDate,
      tags,
      isMust,
      isImportant
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        aria-labelledby="new-task-modal-title"
        aria-describedby="new-task-modal-description"
      >
        <DialogHeader>
          <DialogTitle id="new-task-modal-title" className="flex items-center gap-2">
            <Lightning size={24} className="text-brand-purple" weight="fill" />
            Dodaj nowe zadanie
          </DialogTitle>
        </DialogHeader>
        
        <div id="new-task-modal-description" className="sr-only">
          Formularz dodawania nowego zadania z wszystkimi opcjami konfiguracji
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label className="text-sm font-medium mb-1 block">Tytuł zadania *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co chcesz zrobić?"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">Opis (opcjonalny)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe szczegóły..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none resize-none"
            />
          </div>

          {/* Estimate Buttons */}
          <div>
            <label className="text-sm font-medium mb-2 block">Estymat czasu:</label>
            <div className="flex gap-2 flex-wrap">
              {[5, 15, 25, 30, 45, 60, 90, 120].map(min => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setEstimateMin(min)}
                  className={`
                    px-3 py-2 rounded-lg border-2 transition-all text-sm
                    ${estimateMin === min
                      ? 'border-brand-purple bg-brand-purple/10 text-brand-purple font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {min} min
                </button>
              ))}
            </div>
            
            {/* AI Suggestion Badge */}
            <AISuggestionBadge 
              suggestion={aiSuggestion}
              onApply={(suggestedMinutes) => setEstimateMin(suggestedMinutes)}
            />
          </div>

          {/* Cognitive Load Slider */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Obciążenie kognitywne: <span className="font-bold text-brand-purple">{cognitiveLoad}/5</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={cognitiveLoad}
              onChange={(e) => setCognitiveLoad(Number(e.target.value))}
              className="w-full accent-brand-purple"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Łatwe</span>
              <span>Średnie</span>
              <span>Trudne</span>
            </div>
          </div>

          {/* Context Type Buttons */}
          <div>
            <label className="text-sm font-medium mb-2 block">Typ pracy:</label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setContextType('deep_work')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                  ${contextType === 'deep_work'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <Brain size={20} />
                Deep Work
              </button>
              <button
                type="button"
                onClick={() => setContextType('admin')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                  ${contextType === 'admin'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <Envelope size={20} />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setContextType('communication')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                  ${contextType === 'communication'
                    ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <ChatCircle size={20} />
                Komunikacja
              </button>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Priorytet: <span className="font-bold text-brand-purple">{priority}</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`
                    flex-1 py-2 rounded-lg border-2 transition-all text-sm font-medium
                    ${priority === p
                      ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Niski</span>
              <span>Wysoki</span>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-2">
              <Calendar size={16} />
              Termin:
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-2">
              <Tag size={16} />
              Tagi (oddziel przecinkami):
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="np. pilne, projekt, dokumentacja"
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMust}
                onChange={(e) => setIsMust(e.target.checked)}
                className="w-5 h-5 text-brand-purple border-gray-300 rounded focus:ring-brand-purple"
              />
              <span className="text-sm font-medium">📌 MUST (priorytet na dzisiaj)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-5 h-5 text-brand-purple border-gray-300 rounded focus:ring-brand-purple"
              />
              <span className="text-sm font-medium">⭐ Ważne</span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 bg-gradient-to-r from-brand-purple to-brand-pink"
            >
              Dodaj zadanie
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Anuluj
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500" role="note">
            Naciśnij <kbd className="px-2 py-1 bg-gray-100 rounded text-xs" aria-label="klawisz Enter">Enter</kbd> aby dodać lub <kbd className="px-2 py-1 bg-gray-100 rounded text-xs" aria-label="klawisz Escape">Esc</kbd> aby anulować
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
