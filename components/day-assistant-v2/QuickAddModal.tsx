'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { Lightning, Brain, Envelope, ChatCircle } from '@phosphor-icons/react'
import { TaskContext } from '@/lib/services/contextInferenceService'

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (task: {
    title: string
    estimateMin: number
    context: TaskContext
    isMust: boolean
  }) => void
}

export function QuickAddModal({ isOpen, onClose, onSubmit }: QuickAddModalProps) {
  const [title, setTitle] = useState('')
  const [estimateMin, setEstimateMin] = useState(25)
  const [context, setContext] = useState<TaskContext>('deep_work')
  const [isMust, setIsMust] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setTitle('')
      setEstimateMin(25)
      setContext('deep_work')
      setIsMust(false)
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      title: title.trim(),
      estimateMin,
      context,
      isMust
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightning size={24} className="text-brand-purple" weight="fill" />
            Szybkie dodanie zadania
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co chcesz zrobić?"
              autoFocus
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-brand-purple focus:outline-none text-lg"
            />
          </div>

          {/* Estimate Buttons */}
          <div>
            <p className="text-sm font-medium mb-2">Estymat czasu:</p>
            <div className="flex gap-2">
              {[5, 15, 30, 60].map(min => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setEstimateMin(min)}
                  className={`
                    px-4 py-2 rounded-lg border-2 transition-all
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
          </div>

          {/* Context Buttons */}
          <div>
            <p className="text-sm font-medium mb-2">Typ pracy:</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContext('deep_work')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                  ${context === 'deep_work'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <Brain size={20} />
                Deep
              </button>
              <button
                type="button"
                onClick={() => setContext('admin')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                  ${context === 'admin'
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
                onClick={() => setContext('communication')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                  ${context === 'communication'
                    ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <ChatCircle size={20} />
                Comms
              </button>
            </div>
          </div>

          {/* MUST Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMust}
                onChange={(e) => setIsMust(e.target.checked)}
                className="w-5 h-5 text-brand-purple border-gray-300 rounded focus:ring-brand-purple"
              />
              <span className="text-sm font-medium">📌 MUST (priorytet na dzisiaj)</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
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

          <p className="text-xs text-center text-gray-500">
            Naciśnij <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> aby dodać lub <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> aby anulować
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
