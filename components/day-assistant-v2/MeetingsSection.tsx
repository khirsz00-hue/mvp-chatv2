'use client'

import { useState } from 'react'
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
      <Card className="mb-4 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
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
    <Card className="mb-4 border-blue-300 bg-blue-50">
      <CardHeader 
        className="cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{expanded ? '▼' : '▶'}</span>
            📅 SPOTKANIA DZIŚ ({meetings.length})
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

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const startTime = format(new Date(meeting.start_time), 'HH:mm')
  const endTime = format(new Date(meeting.end_time), 'HH:mm')
  const minutesUntil = differenceInMinutes(
    new Date(meeting.start_time),
    new Date()
  )
  
  const isUpcoming = minutesUntil > 0 && minutesUntil <= 60
  const isPast = minutesUntil < -meeting.duration_minutes

  return (
    <div className={`
      p-3 rounded-lg border-l-4 transition-colors
      ${isPast ? 'border-gray-300 bg-gray-50 opacity-60' : ''}
      ${isUpcoming ? 'border-orange-500 bg-orange-50' : ''}
      ${!isPast && !isUpcoming ? 'border-blue-500 bg-white' : ''}
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{meeting.title}</span>
            {isUpcoming && (
              <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded whitespace-nowrap">
                Za {minutesUntil} min
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
                📍 {meeting.meeting_link.includes('meet.google') ? 'Google Meet' : 
                     meeting.meeting_link.includes('zoom') ? 'Zoom' : 
                     'Link do spotkania'}
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
