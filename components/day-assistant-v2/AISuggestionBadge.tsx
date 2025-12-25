'use client'

import { Lightbulb } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { EstimateSuggestion } from '@/lib/taskLearning'

interface AISuggestionBadgeProps {
  suggestion: EstimateSuggestion | null
  onApply: (suggestedMinutes: number) => void
}

export function AISuggestionBadge({ suggestion, onApply }: AISuggestionBadgeProps) {
  if (!suggestion) return null
  
  return (
    <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-start gap-2">
        <Lightbulb className="text-purple-600 mt-0.5 flex-shrink-0" size={20} weight="fill" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-purple-900">
            💡 AI Suggestion: {suggestion.aiSuggestion}min
          </p>
          <p className="text-xs text-purple-700 mt-1">
            {suggestion.reasoning}
          </p>
          {suggestion.confidence === 'high' && (
            <p className="text-xs text-purple-600 mt-0.5">
              ✨ Wysoka pewność
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onApply(suggestion.aiSuggestion)}
          className="border-purple-300 text-purple-700 hover:bg-purple-100 flex-shrink-0"
        >
          Użyj AI
        </Button>
      </div>
    </div>
  )
}
