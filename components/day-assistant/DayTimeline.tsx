'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Clock,
  CalendarBlank,
  Lightning,
  CheckCircle,
  X,
  ArrowsClockwise
} from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { format, parseISO, addMinutes } from 'date-fns'
import { pl } from 'date-fns/locale'
import { apiGet, apiPost } from '@/lib/api'

interface TimelineEvent {
  id: string
  type: 'meeting' | 'event' | 'task-block' | 'ghost-proposal' | 'queue-task'
  title: string
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  duration: number   // minutes
  priority?: 'now' | 'next' | 'later'
  color?: string
  taskIds?: string[]
  mutable?: boolean  // can be moved
  metadata?: Record<string, any>
}

interface DayTimelineProps {
  userId: string
  date?: string  // ISO date string, defaults to today
  workingHours?: { start: number; end: number }  // e.g., { start: 9, end: 17 }
  onEventClick?: (event: TimelineEvent) => void
  onApproveProposal?: (event: TimelineEvent) => void
  onRejectProposal?: (event: TimelineEvent) => void
  onRefresh?: () => void
}

const EVENT_COLORS = {
  meeting: 'bg-blue-500',
  event: 'bg-green-500',
  'task-block': 'bg-purple-500',
  'ghost-proposal': 'bg-gray-400 opacity-60 border-2 border-dashed',
  'queue-task': 'bg-brand-purple'
} as const

// Event type constants
const EVENT_TYPE_TASK_BLOCK = 'task-block' as const

// Priority-specific colors for queue tasks
const PRIORITY_COLORS = {
  now: 'bg-brand-purple border-2 border-brand-purple',
  next: 'bg-green-500/80',
  later: 'bg-gray-400/60'
}

export function DayTimeline({
  userId,
  date,
  workingHours = { start: 9, end: 17 },
  onEventClick,
  onApproveProposal,
  onRejectProposal,
  onRefresh
}: DayTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  const today = date || format(new Date(), 'yyyy-MM-dd')

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load timeline events - single fetch, no cascade
  useEffect(() => {
    const loadTimeline = async () => {
      setLoading(true)
      try {
        // Fetch timeline built from queue data (single fetch)
        const response = await apiGet(`/api/day-assistant/timeline?date=${today}&includeAll=false`)
        if (response.ok) {
          const data = await response.json()
          console.log('📅 Timeline loaded:', data.queueSummary)
          // Set events even if empty (prevents reload loop)
          setEvents(data.events || [])
        } else if (response.status === 401) {
          console.error('Error loading timeline: Session missing')
          // Set empty array to prevent reload attempts
          setEvents([])
        } else {
          console.error('Error loading timeline:', response.statusText)
          // Set empty array on error to show empty state
          setEvents([])
        }
      } catch (error) {
        console.error('Error loading timeline:', error)
        // Set empty array on error to show empty state
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      loadTimeline()
    }
  }, [userId, today])

  const handleApprove = async (event: TimelineEvent) => {
    if (onApproveProposal) {
      onApproveProposal(event)
    }
    
    try {
      const response = await apiPost('/api/day-assistant/timeline/approve', { eventId: event.id })
      
      if (response.ok) {
        // Optimistically update local state instead of full refresh
        setEvents(prev => prev.map(e => 
          e.id === event.id ? { ...e, type: EVENT_TYPE_TASK_BLOCK } : e
        ))
        // Only refresh queue if callback provided (debounced by parent)
        if (onRefresh) {
          onRefresh()
        }
      }
    } catch (error) {
      console.error('Error approving proposal:', error)
    }
  }

  const handleReject = async (event: TimelineEvent) => {
    if (onRejectProposal) {
      onRejectProposal(event)
    }

    try {
      const response = await apiPost('/api/day-assistant/timeline/reject', { eventId: event.id })

      if (response.ok) {
        // Optimistically remove from local state instead of full refresh
        setEvents(prev => prev.filter(e => e.id !== event.id))
        // Only refresh queue if callback provided (debounced by parent)
        if (onRefresh) {
          onRefresh()
        }
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error)
    }
  }

  // Calculate position for events
  const getEventStyle = (event: TimelineEvent) => {
    const [startHour, startMin] = event.startTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const workStartMinutes = workingHours.start * 60
    const workEndMinutes = workingHours.end * 60
    const totalWorkMinutes = workEndMinutes - workStartMinutes

    const top = ((startMinutes - workStartMinutes) / totalWorkMinutes) * 100
    const height = (event.duration / totalWorkMinutes) * 100

    return {
      top: `${Math.max(0, top)}%`,
      height: `${height}%`,
      minHeight: '40px'
    }
  }

  // Get current time indicator position
  const getCurrentTimePosition = () => {
    const now = currentTime
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const workStartMinutes = workingHours.start * 60
    const workEndMinutes = workingHours.end * 60
    const totalWorkMinutes = workEndMinutes - workStartMinutes

    const position = ((currentMinutes - workStartMinutes) / totalWorkMinutes) * 100

    if (position < 0 || position > 100) return null
    return position
  }

  const currentTimePosition = getCurrentTimePosition()

  // Generate hour markers (including half-hour markers for better granularity)
  const hourMarkers = []
  for (let hour = workingHours.start; hour <= workingHours.end; hour++) {
    hourMarkers.push({ hour, isFullHour: true })
    if (hour < workingHours.end) {
      hourMarkers.push({ hour: hour + 0.5, isFullHour: false })
    }
  }

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Ładowanie harmonogramu...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarBlank size={24} className="text-brand-purple" />
            Harmonogram dnia
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {format(parseISO(today), 'd MMMM yyyy', { locale: pl })}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onRefresh}
          title="Odśwież harmonogram"
        >
          <ArrowsClockwise size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="relative" style={{ minHeight: '600px' }}>
          {/* Hour markers with grid lines */}
          <div className="absolute inset-0">
            {hourMarkers.map((marker, idx) => {
              const totalSlots = hourMarkers.length
              const position = (idx / totalSlots) * 100
              const displayHour = Math.floor(marker.hour)
              const displayMinute = marker.isFullHour ? '00' : '30'
              
              return (
                <div
                  key={`${marker.hour}-${idx}`}
                  className={`absolute left-0 right-0 ${marker.isFullHour ? 'border-t-2 border-border' : 'border-t border-border/50 border-dashed'}`}
                  style={{ top: `${position}%` }}
                >
                  {marker.isFullHour && (
                    <span className="absolute -left-12 -top-2 text-xs font-medium text-muted-foreground">
                      {`${displayHour}:${displayMinute}`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-0 right-0 z-10"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
              <span className="absolute -left-12 -top-2 text-xs text-red-500 font-semibold">
                Teraz
              </span>
            </div>
          )}

          {/* Events */}
          <div className="absolute inset-0 pl-4">
            {events.map((event) => {
              // Determine color based on type and priority
              let colorClass = EVENT_COLORS[event.type]
              if (event.type === 'queue-task' && event.priority) {
                colorClass = PRIORITY_COLORS[event.priority]
              }
              
              return (
              <motion.div
                key={event.id}
                className={`absolute left-4 right-4 rounded-lg p-3 cursor-pointer ${colorClass} text-white overflow-hidden`}
                style={getEventStyle(event)}
                onClick={() => onEventClick && onEventClick(event)}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs opacity-90">
                      {event.startTime} - {event.endTime} ({event.duration} min)
                    </p>
                    {event.taskIds && event.taskIds.length > 0 && (
                      <p className="text-xs opacity-80 mt-1">
                        {event.taskIds.length} zadań
                      </p>
                    )}
                  </div>

                  {/* Actions for ghost proposals */}
                  {event.type === 'ghost-proposal' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApprove(event)
                        }}
                        className="p-1 bg-green-600 hover:bg-green-700 rounded"
                        title="Zatwierdź"
                      >
                        <CheckCircle size={16} weight="fill" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReject(event)
                        }}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded"
                        title="Odrzuć"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>
                  )}

                  {/* Icon for event type */}
                  {event.type === 'meeting' && (
                    <CalendarBlank size={16} className="flex-shrink-0" />
                  )}
                  {event.type === 'task-block' && (
                    <Lightning size={16} className="flex-shrink-0" />
                  )}
                </div>
              </motion.div>
            )
            })}
          </div>

          {/* Empty state */}
          {events.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Clock size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Brak zaplanowanych wydarzeń</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
