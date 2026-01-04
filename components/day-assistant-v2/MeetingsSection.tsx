'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { format, differenceInMinutes, isWithinInterval } from 'date-fns'
import { VideoCamera, MapPin, ArrowSquareOut, Clock, Users } from '@phosphor-icons/react'

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
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  // Calculate total time for all meetings
  const totalMinutes = meetings.reduce((sum, m) => sum + m.duration_minutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  // No meetings case
  if (meetings.length === 0) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 rounded-xl">
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

  const firstMeeting = meetings[0]
  const remainingMeetings = meetings.slice(1)

  return (
    <section className="mb-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-gray-900">Spotkania na dziś</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {meetings.length} {meetings.length === 1 ? 'spotkanie' : meetings.length < 5 ? 'spotkania' : 'spotkań'} • {timeString}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            {refreshing ? '⏳' : '🔄'}
          </Button>
        </div>
      </div>

      {/* First meeting - large featured card */}
      <LargeMeetingCard meeting={firstMeeting} />

      {/* Remaining meetings - compact grid */}
      {remainingMeetings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {remainingMeetings.map(meeting => (
            <CompactMeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </section>
  )
}

// Helper functions
function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

function getMeetingType(title: string, metadata?: any): 'team' | 'client' | '1on1' {
  const titleLower = title.toLowerCase()
  const eventType = metadata?.eventType?.toLowerCase() || ''
  
  if (titleLower.includes('client') || eventType.includes('client')) return 'client'
  if (titleLower.includes('1:1') || titleLower.includes('1-on-1') || eventType.includes('1on1')) return '1on1'
  return 'team'
}

function getTypeColors(type: 'team' | 'client' | '1on1') {
  switch (type) {
    case 'client':
      return {
        gradient: 'from-violet-50 to-white',
        border: 'border-violet-100',
        badge: 'bg-violet-100 text-violet-700',
        text: 'text-violet-600'
      }
    case '1on1':
      return {
        gradient: 'from-emerald-50 to-white',
        border: 'border-emerald-100',
        badge: 'bg-emerald-100 text-emerald-700',
        text: 'text-emerald-600'
      }
    default:
      return {
        gradient: 'from-blue-50 to-white',
        border: 'border-blue-100',
        badge: 'bg-blue-100 text-blue-700',
        text: 'text-blue-600'
      }
  }
}

function getMeetingPlatform(link?: string): { name: string; icon: JSX.Element } {
  if (!link) return { name: 'Link do spotkania', icon: <ArrowSquareOut size={16} /> }
  
  try {
    const url = new URL(link)
    const hostname = url.hostname.toLowerCase()
    
    if (hostname === 'meet.google.com' || hostname.endsWith('.meet.google.com')) {
      return { name: 'Google Meet', icon: <VideoCamera size={16} weight="fill" /> }
    }
    if (hostname === 'zoom.us' || hostname.endsWith('.zoom.us')) {
      return { name: 'Zoom', icon: <VideoCamera size={16} weight="fill" /> }
    }
    if (hostname === 'teams.microsoft.com' || hostname.endsWith('.teams.microsoft.com')) {
      return { name: 'Microsoft Teams', icon: <VideoCamera size={16} weight="fill" /> }
    }
    return { name: 'Link do spotkania', icon: <ArrowSquareOut size={16} /> }
  } catch {
    return { name: 'Link do spotkania', icon: <ArrowSquareOut size={16} /> }
  }
}

// Hook for live countdown
function useCountdown(startTime: string, endTime: string) {
  const [status, setStatus] = useState<'upcoming' | 'active' | 'past'>('upcoming')
  const [minutesUntil, setMinutesUntil] = useState<number>(0)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const start = new Date(startTime)
      const end = new Date(endTime)

      if (now < start) {
        setStatus('upcoming')
        setMinutesUntil(Math.floor((start.getTime() - now.getTime()) / 1000 / 60))
      } else if (now >= start && now <= end) {
        setStatus('active')
        setMinutesUntil(0)
      } else {
        setStatus('past')
        setMinutesUntil(0)
      }
    }

    update()
    const interval = setInterval(update, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [startTime, endTime])

  return { status, minutesUntil }
}

// Large featured card for first meeting
function LargeMeetingCard({ meeting }: { meeting: Meeting }) {
  const { status, minutesUntil } = useCountdown(meeting.start_time, meeting.end_time)
  const meetingType = getMeetingType(meeting.title, meeting.metadata)
  const colors = getTypeColors(meetingType)
  const platform = getMeetingPlatform(meeting.meeting_link)
  
  const startTime = format(new Date(meeting.start_time), 'HH:mm')
  const endTime = format(new Date(meeting.end_time), 'HH:mm')

  // Calculate progress for active meetings
  const progress = status === 'active' ? (() => {
    const now = new Date()
    const start = new Date(meeting.start_time)
    const end = new Date(meeting.end_time)
    const total = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  })() : status === 'past' ? 100 : 0

  const attendeeCount = meeting.metadata?.attendees || 0

  return (
    <Card className={`bg-gradient-to-r ${colors.gradient} border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Left: Time section */}
          <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-1 sm:min-w-[80px]">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0">
              <span className="text-2xl font-bold text-gray-900">{startTime}</span>
              <span className="text-xs text-gray-500">{meeting.duration_minutes} min</span>
            </div>
            
            {/* Progress bar - only for active meetings */}
            {status === 'active' && (
              <div className="hidden sm:block w-full mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1 block">{Math.round(progress)}%</span>
              </div>
            )}
          </div>

          {/* Middle: Details section */}
          <div className="flex-1 min-w-0">
            {/* Badge and countdown */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${colors.badge}`}>
                {meetingType === '1on1' ? '1:1' : meetingType === 'client' ? 'Client' : 'Spotkanie'}
              </span>
              
              {status === 'upcoming' && (
                <span className="text-sm font-semibold text-orange-600">
                  Za {formatCountdown(minutesUntil)}
                </span>
              )}
              
              {status === 'active' && (
                <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded animate-pulse">
                  Trwa
                </span>
              )}
              
              {status === 'past' && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                  Zakończone
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className={`text-lg font-bold mb-1 hover:${colors.text} transition-colors cursor-pointer truncate`}>
              {meeting.title}
            </h3>

            {/* Description */}
            {meeting.metadata?.description && (
              <p className="text-xs text-gray-600 line-clamp-1 mb-2">
                {meeting.metadata.description}
              </p>
            )}

            {/* Attendees and platform */}
            <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
              {attendeeCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  {attendeeCount} {attendeeCount === 1 ? 'osoba' : 'osób'}
                </span>
              )}
              
              {meeting.meeting_link ? (
                <span className="flex items-center gap-1">
                  {platform.icon}
                  {platform.name}
                </span>
              ) : meeting.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={16} />
                  {meeting.location}
                </span>
              )}
              
              <span className="text-xs text-gray-400">
                {startTime}-{endTime}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          {meeting.meeting_link && status !== 'past' && (
            <div className="flex sm:flex-col items-center sm:items-end gap-2">
              <Button
                size="sm"
                onClick={() => window.open(meeting.meeting_link, '_blank')}
                className="w-full sm:w-auto"
              >
                <ArrowSquareOut size={16} className="mr-1" />
                Dołącz
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Compact card for remaining meetings
function CompactMeetingCard({ meeting }: { meeting: Meeting }) {
  const { status, minutesUntil } = useCountdown(meeting.start_time, meeting.end_time)
  const meetingType = getMeetingType(meeting.title, meeting.metadata)
  const colors = getTypeColors(meetingType)
  const platform = getMeetingPlatform(meeting.meeting_link)
  
  const startTime = format(new Date(meeting.start_time), 'HH:mm')

  // Determine border color based on type
  const borderColor = meetingType === 'client' ? 'border-violet-200' : 
                      meetingType === '1on1' ? 'border-emerald-200' : 
                      'border-blue-200'

  return (
    <div className={`bg-white p-3 rounded-lg border-2 ${borderColor} hover:shadow-sm transition-shadow`}>
      <div className="flex items-start gap-2">
        {/* Left: Time */}
        <div className="flex flex-col items-start min-w-[60px]">
          <span className="text-lg font-bold text-gray-900">{startTime}</span>
          <span className="text-xs text-gray-500">{meeting.duration_minutes}m</span>
        </div>

        {/* Middle: Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded uppercase ${colors.badge}`}>
              {meetingType === '1on1' ? '1:1' : meetingType === 'client' ? 'Client' : 'Team'}
            </span>
            
            {status === 'active' && (
              <span className="text-xs font-semibold text-red-600">Trwa</span>
            )}
            
            {status === 'upcoming' && minutesUntil <= 30 && (
              <span className="text-xs font-semibold text-orange-600">Za {minutesUntil}m</span>
            )}
          </div>
          
          <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
            {meeting.title}
          </h4>
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {platform.icon}
            <span className="truncate">{platform.name}</span>
          </div>
        </div>

        {/* Right: Join button */}
        {meeting.meeting_link && status !== 'past' && (
          <button
            onClick={() => window.open(meeting.meeting_link, '_blank')}
            className="shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            aria-label="Dołącz do spotkania"
          >
            <ArrowSquareOut size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
}
