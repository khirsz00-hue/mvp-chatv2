/**
 * Hook: useDayPlan
 * Loads and persists energy/focus slider values with debouncing
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { DayPlan } from '@/lib/types/dayAssistantV2'

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

interface UseDayPlanOptions {
  onUpdate?: (energy: number, focus: number) => void
}

export function useDayPlan(
  sessionToken: string | null,
  selectedDate: string,
  initialDayPlan: DayPlan | null,
  options?: UseDayPlanOptions
) {
  const [energy, setEnergy] = useState(initialDayPlan?.energy || 3)
  const [focus, setFocus] = useState(initialDayPlan?.focus || 3)
  const [loading, setLoading] = useState(false)

  // Update local state when initialDayPlan changes
  useEffect(() => {
    if (initialDayPlan) {
      setEnergy(initialDayPlan.energy)
      setFocus(initialDayPlan.focus)
    }
  }, [initialDayPlan])

  // Debounced persist function
  const debouncedPersist = useMemo(
    () =>
      debounce(async (newEnergy: number, newFocus: number) => {
        if (!sessionToken) return

        try {
          const response = await fetch('/api/day-assistant-v2/dayplan', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              date: selectedDate,
              energy: newEnergy,
              focus: newFocus
            })
          })

          if (response.ok) {
            const data = await response.json()
            // Optionally trigger recommendation refresh
            if (options?.onUpdate) {
              options.onUpdate(newEnergy, newFocus)
            }
          }
        } catch (error) {
          console.error('[useDayPlan] Error persisting slider values:', error)
        }
      }, 500),
    [sessionToken, selectedDate, options]
  )

  const updateEnergy = useCallback(
    (value: number) => {
      setEnergy(value)
      debouncedPersist(value, focus)
    },
    [focus, debouncedPersist]
  )

  const updateFocus = useCallback(
    (value: number) => {
      setFocus(value)
      debouncedPersist(energy, value)
    },
    [energy, debouncedPersist]
  )

  return {
    energy,
    focus,
    updateEnergy,
    updateFocus,
    loading
  }
}
