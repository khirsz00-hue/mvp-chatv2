'use client'

import { useEffect, useState } from 'react'
import { WeekAssistantClient } from '@/app/assistant-week/components/WeekAssistantClient'
import { getWeekSnapshot } from '@/app/assistant-week/actions'
import { WeekSnapshot } from '@/app/assistant-week/types'

export function WeekAssistantView() {
  const [snapshot, setSnapshot] = useState<WeekSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const data = await getWeekSnapshot()
        setSnapshot(data)
      } catch (error) {
        console.error('Error loading week snapshot:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSnapshot()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie asystenta tygodnia...</p>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Nie udało się załadować danych asystenta tygodnia</p>
        </div>
      </div>
    )
  }

  return <WeekAssistantClient initialData={snapshot} />
}
