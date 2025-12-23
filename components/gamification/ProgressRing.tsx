'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getTodayISO } from '@/lib/gamification'

interface DailyProgress {
  completed: number
  total: number
}

export function ProgressRing() {
  const [progress, setProgress] = useState<DailyProgress>({ completed: 0, total: 0 })

  useEffect(() => {
    loadProgress()
    
    // Set up realtime subscription for daily_stats updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const channel = supabase
        .channel('daily_stats_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_stats',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Update progress when daily_stats changes
            loadProgress()
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    }
    
    setupSubscription()
  }, [])

  const loadProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = getTodayISO()

    const { data } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (data) {
      setProgress({ completed: data.tasks_completed, total: data.tasks_total })
    }
  }

  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0
  const color = percentage >= 70 ? 'text-green-600' : percentage >= 30 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-2">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeDasharray={`${2 * Math.PI * 20}`}
          strokeDashoffset={`${2 * Math.PI * 20 * (1 - percentage / 100)}`}
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className={`text-sm font-bold ${color}`}>{progress.completed}/{progress.total}</p>
        <p className="text-xs text-gray-600">Dzisiaj</p>
      </div>
    </div>
  )
}
