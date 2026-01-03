'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { format, differenceInMinutes } from 'date-fns'

interface Meeting {
  id: string
  google_event_id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  location?: string
  meeting_link?: string
  metadata?: any
}

interface MeetingsSectionProps {
  meetings: Meeting[]
  onRefresh: () => Promise<void>
}

export function MeetingsSection({ meetings, onRefresh }: MeetingsSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  if (meetings.length === 0) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">
              📅 Brak spotkań dziś
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? '⏳' : '🔄'} Odśwież
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md">
      <CardHeader 
        className="cursor-pointer hover:bg-emerald-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-900">
            <span>{expanded ? '▼' : '▶'}</span>
            📅 Spotkania na dziś ({meetings.length})
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation()
              handleRefresh()
            }}
            disabled={refreshing}
          >
            {refreshing ? '⏳' : '🔄'}
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {meetings.map(meeting => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

// Helper function to format countdown
function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const startTime = format(new Date(meeting.start_time), 'HH:mm')
  const endTime = format(new Date(meeting.end_time), 'HH:mm')
  
  // Live countdown state
  const [minutesUntil, setMinutesUntil] = useState<number | null>(null)
  
  // Update countdown every minute
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const start = new Date(meeting.start_time)
      const diff = Math.floor((start.getTime() - now.getTime()) / 1000 / 60)
      setMinutesUntil(diff)
    }
    
    updateCountdown() // Initial calculation
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [meeting.start_time])
  
  const isUpcoming = minutesUntil !== null && minutesUntil > 0 && minutesUntil <= 60
  const isPast = minutesUntil !== null && minutesUntil < -meeting.duration_minutes

  // Improved meeting platform detection
  const getMeetingPlatform = (link?: string): string => {
    if (!link) return 'Link do spotkania'
    try {
      const url = new URL(link)
      const hostname = url.hostname.toLowerCase()
      // Check exact hostname or subdomain patterns
      if (hostname === 'meet.google.com' || hostname.endsWith('.meet.google.com')) return 'Google Meet'
      if (hostname === 'zoom.us' || hostname.endsWith('.zoom.us')) return 'Zoom'
      if (hostname === 'teams.microsoft.com' || hostname.endsWith('.teams.microsoft.com')) return 'Microsoft Teams'
      return 'Link do spotkania'
    } catch {
      // Invalid URL - return generic label
      return 'Link do spotkania'
    }
  }

  return (
    <div className={`
      p-4 rounded-lg border-l-4 transition-all shadow-sm
      ${isPast ? 'border-gray-300 bg-gray-50/50 opacity-60' : ''}
      ${isUpcoming ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50' : ''}
      ${!isPast && !isUpcoming ? 'border-emerald-500 bg-gradient-to-r from-white to-emerald-50/30' : ''}
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{meeting.title}</span>
            {minutesUntil !== null && minutesUntil > 0 && (
              <span className="text-sm text-orange-600 font-semibold">
                Za {formatCountdown(minutesUntil)}
              </span>
            )}
            {isPast && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                Zakończone
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              🕐 {startTime}-{endTime}
            </span>
            <span className="flex items-center gap-1">
              ⏱️ {meeting.duration_minutes} min
            </span>
          </div>
          
          {meeting.meeting_link && (
            <div className="mt-2">
              <a 
                href={meeting.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                📍 {getMeetingPlatform(meeting.meeting_link)}
              </a>
            </div>
          )}
        </div>
        
        {isUpcoming && meeting.meeting_link && !isPast && (
          <Button 
            size="sm"
            onClick={() => window.open(meeting.meeting_link, '_blank')}
            className="shrink-0"
          >
            Dołącz
          </Button>
        )}
      </div>
    </div>
  )
}
