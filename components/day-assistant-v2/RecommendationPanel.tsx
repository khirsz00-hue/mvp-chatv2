/**
 * RecommendationPanel Component
 * Shows actionable recommendations with Apply button
 */

'use client'

import { useState, useEffect } from 'react'
import { Recommendation } from '@/lib/types/dayAssistantV2'
import Button from '@/components/ui/Button'
import { CheckCircle } from '@phosphor-icons/react'

interface RecommendationPanelProps {
  recommendations: Recommendation[]
  onApply: (recommendation: Recommendation) => Promise<void>
  loading?: boolean
}

export function RecommendationPanel({ recommendations, onApply, loading }: RecommendationPanelProps) {
  const [applyingId, setApplyingId] = useState<string | null>(null)
  
  // Load applied IDs from localStorage on mount
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('appliedRecommendationIds')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return new Set(parsed)
        } catch (e) {
          console.error('Failed to parse applied recommendation IDs from localStorage:', e)
        }
      }
    }
    return new Set()
  })
  
  // Persist applied IDs to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appliedRecommendationIds', JSON.stringify(Array.from(appliedIds)))
    }
  }, [appliedIds])

  const handleApply = async (rec: Recommendation) => {
    // Prevent multiple clicks
    if (applyingId || appliedIds.has(rec.id)) {
      return
    }
    
    setApplyingId(rec.id)
    
    try {
      await onApply(rec)
      
      // Mark as applied (optimistic update)
      setAppliedIds(prev => new Set(prev).add(rec.id))
      
      console.log('✅ [RecommendationPanel] Applied recommendation:', rec.id)
    } catch (error) {
      console.error('❌ [RecommendationPanel] Error applying recommendation:', error)
      
      // Roll back optimistic update - remove from appliedIds to allow retry
      setAppliedIds(prev => {
        const next = new Set(prev)
        next.delete(rec.id)
        return next
      })
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

  // Filter out already applied recommendations
  const activeRecommendations = recommendations.filter(rec => !appliedIds.has(rec.id))

  if (activeRecommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Brak aktywnych rekomendacji. Zmiany energii/skupienia lub nowe zadania wywołają rekomendacje.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {activeRecommendations.map(rec => {
        const isApplying = applyingId === rec.id
        const isApplied = appliedIds.has(rec.id)
        
        return (
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
                disabled={isApplying || isApplied}
                className="ml-4 bg-green-600 hover:bg-green-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                    Stosuję...
                  </>
                ) : isApplied ? (
                  <>
                    <CheckCircle size={16} className="mr-1" weight="fill" />
                    Zastosowano
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
        )
      })}
    </div>
  )
}
