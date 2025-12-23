/**
 * Hook: useRecommendations
 * Fetches and manages real-time recommendations based on context
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Recommendation, TestDayTask } from '@/lib/types/dayAssistantV2'

interface UseRecommendationsOptions {
  sessionToken: string | null
  selectedDate: string
  energy: number
  focus: number
  tasks: TestDayTask[]
  contextFilter: string | null
  enabled?: boolean
}

export function useRecommendations(options: UseRecommendationsOptions) {
  const {
    sessionToken,
    selectedDate,
    energy,
    focus,
    tasks,
    contextFilter,
    enabled = true
  } = options

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if (!sessionToken || !enabled) return

    try {
      setLoading(true)
      const response = await fetch('/api/day-assistant-v2/recommend', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          trigger: 'manual_refresh',
          context: {
            energy,
            focus,
            current_tasks: tasks,
            context_filter: contextFilter
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations)
        } else {
          setRecommendations([])
        }
      }
    } catch (error) {
      console.error('[useRecommendations] Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionToken, selectedDate, energy, focus, tasks, contextFilter, enabled])

  // Refresh when dependencies change (debounced via useEffect)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations()
    }, 1000) // Debounce 1s to avoid too many requests

    return () => clearTimeout(timer)
  }, [fetchRecommendations])

  // Background refresh every 2 minutes
  useEffect(() => {
    if (!enabled || !sessionToken) return

    const interval = setInterval(() => {
      fetchRecommendations()
    }, 2 * 60 * 1000) // 2 minutes

    refreshTimerRef.current = interval

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [enabled, sessionToken, fetchRecommendations])

  return {
    recommendations,
    loading,
    refresh: fetchRecommendations
  }
}
