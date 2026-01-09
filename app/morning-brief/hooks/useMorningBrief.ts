'use client'

import { useState, useEffect, useCallback } from 'react'

interface Task {
  id: string
  content: string
  priority: number
  due?: { date: string } | null
  completed?: boolean
  completed_at?: string | null
  /** Cognitive load rating from 1 (easy) to 5 (hard) */
  cognitive_load?: number
  /** Number of times this task has been postponed */
  postpone_count?: number
  /** Context type for task clustering (e.g., 'deep', 'admin', 'comms') */
  context_type?: string
  /** Calculated score for prioritization */
  score?: number
}

interface Meeting {
  id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  location?: string
  meeting_link?: string
}

interface YesterdayData {
  tasks: Task[]
  lastActiveTask: Task | null
  stats: {
    completed: number
    total: number
  }
}

interface TodayData {
  tasks: Task[]
  focusTask: Task | null
  stats: {
    total: number
    highPriority: number
  }
}

interface SummaryData {
  textToSpeak: string
  yesterdayData: YesterdayData
  todayData: TodayData
  meetings?: Meeting[]
  tips?: string[]
}

interface MorningBriefData {
  yesterday: YesterdayData
  today: TodayData
  summary: string
  meetings: Meeting[]
  tips: string[]
}

export function useMorningBrief(token: string | null) {
  const [data, setData] = useState<MorningBriefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchDate, setLastFetchDate] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('No Todoist token available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 [useMorningBrief] Fetching morning brief data')

      // Fetch summary using POST for security (token in body, not URL)
      const response = await fetch('/api/recap/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch morning brief data')
      }

      const summaryData: SummaryData = await response.json()

      setData({
        yesterday: summaryData.yesterdayData,
        today: summaryData.todayData,
        summary: summaryData.textToSpeak,
        meetings: summaryData.meetings || [],
        tips: summaryData.tips || []
      })

      // Store the date of this fetch
      const today = new Date().toDateString()
      setLastFetchDate(today)
      
      // Cache in localStorage (with date)
      try {
        localStorage.setItem('morning_brief_date', today)
        localStorage.setItem('morning_brief_data', JSON.stringify({
          yesterday: summaryData.yesterdayData,
          today: summaryData.todayData,
          summary: summaryData.textToSpeak,
          meetings: summaryData.meetings || [],
          tips: summaryData.tips || []
        }))
      } catch (e) {
        console.warn('⚠️ Failed to cache morning brief data', e)
      }

      console.log('✅ [useMorningBrief] Data fetched successfully')
    } catch (err) {
      console.error('❌ [useMorningBrief] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [token])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    // Check if we have cached data for today
    try {
      const cachedDate = localStorage.getItem('morning_brief_date')
      const cachedData = localStorage.getItem('morning_brief_data')
      const today = new Date().toDateString()

      if (cachedDate === today && cachedData) {
        // Use cached data
        console.log('✅ [useMorningBrief] Using cached data from today')
        const parsed = JSON.parse(cachedData)
        setData(parsed)
        setLastFetchDate(cachedDate)
        setLoading(false)
        return
      }
    } catch (e) {
      console.warn('⚠️ Failed to load cached data', e)
    }

    // Fetch fresh data
    fetchData()
  }, [token, fetchData])

  return {
    data,
    loading,
    error,
    refresh,
    lastFetchDate
  }
}
