'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface StreakData {
  current_streak: number
  longest_streak: number
  total_completions: number
}

export function StreakDisplay() {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStreak()
  }, [])

  const loadStreak = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setStreak(data || { current_streak: 0, longest_streak: 0, total_completions: 0 })
    setLoading(false)
  }

  if (loading || !streak) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-sm font-bold text-orange-800">{streak.current_streak} dni</p>
          <p className="text-xs text-orange-600">Obecny streak</p>
        </div>
      </div>
      {streak.longest_streak > streak.current_streak && (
        <div className="border-l border-orange-300 pl-3">
          <p className="text-xs text-orange-600">Rekord: {streak.longest_streak}</p>
        </div>
      )}
    </div>
  )
}
