'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { format, differenceInMinutes } from 'date-fns'
import { VideoCamera, MapPin, ArrowSquareOut, Users, Clock } from '@phosphor-icons/react'
import { MeetingEmptyState } from './MeetingEmptyState'
import { MeetingDetailsModal } from './MeetingDetailsModal'

interface Attendee {
  email?: string
  displayName?: string
  responseStatus?: string
  self?: boolean
}

interface Meeting {
  id: string
  google_event_id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  location?: string
  meeting_link?: string
  type?: 'on-site' | 'online' | 'in-office'
  date?: string
  metadata?: {
    description?: string | null
    attendees?: Attendee[]
    hasVideoCall?: boolean
    platform?: string | null
    isAllDay?: boolean
  }
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

  // Live updates handled by useCountdown hook in child components

  // Sort meetings: all-day events first, then by start time
  const sortedMeetings = [...meetings].sort((a, b) => {
    // Całodniowe na początku
    if (a.metadata?.isAllDay && !b.metadata?.isAllDay) return -1
    if (!a.metadata?.isAllDay && b.metadata?.isAllDay) return 1
    
    // Reszta sortowana po czasie rozpoczęcia
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })

  // Calculate total time for all meetings
  const totalMinutes = sortedMeetings.reduce((sum, m) => sum + m.duration_minutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  // No meetings case
  if (sortedMeetings.length === 0) {
    return (
      <div className="mb-6">
        <MeetingEmptyState />
      </div>
    )
  }

  const firstMeeting = sortedMeetings[0]
  const remainingMeetings = sortedMeetings.slice(1)

  return (
    <section className="mb-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-gray-900">Spotkania na dziś</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {sortedMeetings.length} {sortedMeetings.length === 1 ? 'spotkanie' : sortedMeetings.length < 5 ? 'spotkania' : 'spotkań'} • {timeString}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {remainingMeetings.map(meeting => (
            <CompactMeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </section>
  )
}

// Helper functions
function formatTime(timeString: string): string {
  return format(new Date(timeString), 'HH:mm')
}

function getMeetingType(meeting: Meeting): 'on-site' | 'online' | 'in-office' {
  // If type is explicitly set, use it
  if (meeting.type) return meeting.type
  
  // Otherwise infer from other properties
  if (meeting.metadata?.hasVideoCall || meeting.meeting_link?.includes('meet.google.com') || meeting.meeting_link?.includes('zoom.us')) {
    return 'online'
  }
  
  if (meeting.location && !meeting.location.includes('http')) {
    return 'on-site'
  }
  
  return 'in-office'
}

function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

function getCountdown(startTime: string, endTime: string): { text: string, isActive: boolean, progress: number } {
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  if (now > end) {
    return { text: 'Zakończone', isActive: false, progress: 100 }
  }
  
  if (now >= start && now <= end) {
    const total = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    const progress = Math.round((elapsed / total) * 100)
    return { text: 'Trwa', isActive: true, progress }
  }
  
  const minutesUntil = differenceInMinutes(start, now)
  if (minutesUntil < 60) {
    return { text: `Za ${minutesUntil} min`, isActive: false, progress: 0 }
  }
  
  const hours = Math.floor(minutesUntil / 60)
  const mins = minutesUntil % 60
  return { text: `Za ${hours}h ${mins}m`, isActive: false, progress: 0 }
}

function getBadgeColor(meeting: Meeting): string {
  const title = meeting.title.toLowerCase()
  
  if (title.includes('client') || title.includes('klient')) {
    return 'bg-violet-50 text-violet-600 border border-violet-100'
  }
  if (title.includes('1:1') || title.includes('one-on-one')) {
    return 'bg-emerald-50 text-emerald-600 border border-emerald-100'
  }
  return 'bg-blue-100 text-blue-700 border border-blue-100'
}

function getBadgeText(meeting: Meeting): string {
  const title = meeting.title.toLowerCase()
  
  if (title.includes('client') || title.includes('klient')) {
    return 'Klient'
  }
  if (title.includes('1:1') || title.includes('one-on-one')) {
    return '1:1'
  }
  return 'Spotkanie'
}

function getBorderColor(meeting: Meeting): string {
  const title = meeting.title.toLowerCase()
  
  if (meeting.metadata?.isAllDay) {
    return 'border-purple-200'
  }
  if (title.includes('client') || title.includes('klient')) {
    return 'border-violet-200'
  }
  if (title.includes('1:1') || title.includes('one-on-one')) {
    return 'border-emerald-200'
  }
  return 'border-blue-200'
}

function getPlatformIcon(platform: string): string {
  if (platform === 'Google Meet') return '🎥'
  if (platform === 'Zoom') return '📹'
  if (platform === 'Room') return '📍'
  return '🔗'
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
  const [showModal, setShowModal] = useState(false)
  const isAllDay = meeting.metadata?.isAllDay
  
  // Use countdown hook to trigger re-renders every minute
  useCountdown(meeting.start_time, meeting.end_time)
  
  // Get countdown and progress info
  const countdownInfo = getCountdown(meeting.start_time, meeting.end_time)
  const countdown = countdownInfo.text
  const isActive = countdownInfo.isActive
  const progress = countdownInfo.progress

  return (
    <>
      <div 
        className="bg-gradient-to-r from-blue-50 to-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-start gap-4">
        {/* Lewa sekcja - Czas */}
        <div className="flex-shrink-0 w-16 text-center">
          {isAllDay ? (
            <div className="px-2 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded text-xs font-bold uppercase flex items-center gap-1">
              📅 Cały dzień
            </div>
          ) : (
            <>
              <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                {formatTime(meeting.start_time)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {meeting.duration_minutes} min
              </div>
              {/* Progress bar - tylko dla aktywnych spotkań */}
              {isActive && (
                <div className="mt-2 w-full h-1 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all" 
                    style={{width: `${progress}%`}} 
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Środkowa sekcja - Szczegóły */}
        <div className="flex-1 min-w-0">
          {/* Badge + Countdown */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${getBadgeColor(meeting)}`}>
              {getBadgeText(meeting)}
            </span>
            {!isAllDay && countdown && (
              <span className={`text-[10px] font-medium ${isActive ? 'text-red-600' : 'text-slate-400'}`}>
                {countdown}
              </span>
            )}
          </div>

          {/* Tytuł */}
          <h4 className="font-semibold text-slate-800 mb-1.5 group-hover:text-blue-600 transition-colors">
            {meeting.title}
          </h4>

          {/* Opis */}
          {meeting.metadata?.description && (
            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
              {meeting.metadata.description}
            </p>
          )}

          {/* Avatary uczestników + Platforma */}
          <div className="flex items-center gap-3">
            {/* Avatary */}
            {meeting.metadata?.attendees && meeting.metadata.attendees.length > 0 && (
              <div className="flex -space-x-2">
                {meeting.metadata.attendees.slice(0, 3).map((attendee, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold"
                    title={attendee.displayName || attendee.email}
                  >
                    {(attendee.displayName || attendee.email)?.[0]?.toUpperCase()}
                  </div>
                ))}
                {meeting.metadata.attendees.length > 3 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                    +{meeting.metadata.attendees.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Platforma */}
            {meeting.metadata?.platform && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                {getPlatformIcon(meeting.metadata.platform)} {meeting.metadata.platform}
              </span>
            )}
          </div>
        </div>

        {/* Prawa sekcja - Link */}
        <div className="flex flex-col items-end gap-2">
          {meeting.meeting_link && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.open(meeting.meeting_link, '_blank')
              }}
              className="w-8 h-8 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all flex items-center justify-center"
            >
              <ArrowSquareOut size={16} weight="bold" />
            </button>
          )}
        </div>
      </div>
      </div>
      {/* Modal */}
      {showModal && (
        <MeetingDetailsModal
          meeting={{
            ...meeting,
            type: getMeetingType(meeting),
            date: new Date(meeting.start_time).toISOString().split('T')[0]
          } as any}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// Compact card for remaining meetings
function CompactMeetingCard({ meeting }: { meeting: Meeting }) {
  const [showModal, setShowModal] = useState(false)
  const isAllDay = meeting.metadata?.isAllDay
  
  // Use countdown hook to trigger re-renders every minute
  useCountdown(meeting.start_time, meeting.end_time)
  
  const countdownInfo = getCountdown(meeting.start_time, meeting.end_time)
  const countdown = countdownInfo.text
  const isActive = countdownInfo.isActive

  return (
    <>
      <div 
        className={`bg-white p-3 rounded-lg border hover:border-blue-200 transition-all group cursor-pointer ${getBorderColor(meeting)}`}
        onClick={() => setShowModal(true)}
      >
      <div className="flex items-center gap-3">
        {/* Czas */}
        <div className="flex-shrink-0 text-center">
          {isAllDay ? (
            <div className="px-2 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded text-xs font-bold uppercase">
              📅
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-blue-600">
                {formatTime(meeting.start_time)}
              </div>
              <div className="text-[9px] text-slate-400">
                {meeting.duration_minutes}m
              </div>
            </>
          )}
        </div>

        {/* Szczegóły */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-slate-800 truncate group-hover:text-blue-600 transition-colors mb-1">
            {meeting.title}
          </h4>
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${getBadgeColor(meeting)}`}>
              {getBadgeText(meeting)}
            </span>
            {meeting.metadata?.platform && (
              <span className="text-[9px] text-slate-400">
                {getPlatformIcon(meeting.metadata.platform)} {meeting.metadata.platform}
              </span>
            )}
          </div>
        </div>

        {/* Link */}
        {meeting.meeting_link && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(meeting.meeting_link, '_blank')
            }}
            className="w-6 h-6 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all flex items-center justify-center flex-shrink-0"
          >
            <ArrowSquareOut size={12} weight="bold" />
          </button>
        )}
      </div>
      </div>
      {/* Modal */}
      {showModal && (
        <MeetingDetailsModal
          meeting={{
            ...meeting,
            type: getMeetingType(meeting),
            date: new Date(meeting.start_time).toISOString().split('T')[0]
          } as any}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
