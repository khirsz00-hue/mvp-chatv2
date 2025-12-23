/**
 * RecommendationPanel Component
 * Shows actionable recommendations with Apply button
 */

'use client'

import { useState } from 'react'
import { Recommendation } from '@/lib/types/dayAssistantV2'
import Button from '@/components/ui/Button'
import { CheckCircle } from '@phosphor-icons/react'

interface RecommendationPanelProps {
  recommendations: Recommendation[]
  onApply: (recommendation: Recommendation) => void
  loading?: boolean
}

export function RecommendationPanel({ recommendations, onApply, loading }: RecommendationPanelProps) {
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const handleApply = async (rec: Recommendation) => {
    setApplyingId(rec.id)
    try {
      await onApply(rec)
    } finally {
      setApplyingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple" />
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Brak aktywnych rekomendacji. Zmiany energii/skupienia lub nowe zadania wywołają rekomendacje.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {recommendations.map(rec => (
        <div key={rec.id} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900">{rec.title}</h4>
              <p className="text-sm text-blue-700 mt-1">{rec.reason}</p>
              {rec.confidence && (
                <p className="text-xs text-blue-600 mt-2">
                  Pewność: {Math.round(rec.confidence * 100)}%
                </p>
              )}
            </div>
            <Button
              onClick={() => handleApply(rec)}
              size="sm"
              disabled={applyingId === rec.id}
              className="ml-4 bg-green-600 hover:bg-green-700 whitespace-nowrap"
            >
              {applyingId === rec.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                  Stosuję...
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-1" weight="fill" />
                  Zastosuj
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
