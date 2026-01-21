/**
 * MeetingNotificationBanner Component
 * 
 * Displays a prominent, non-dismissable banner at the top of the screen
 * when a meeting is approaching. Features:
 * - Color-coded urgency (red for <=5min, orange for <=15min, indigo for normal)
 * - Meeting type icons (video, map pin, clock)
 * - "Join" button for online meetings
 * - Dismissible with X button
 * - Slide-down animation on appear
 */

'use client'

import { useEffect, useState } from 'react'
import { Clock, X, Video, MapPin } from '@phosphor-icons/react'

interface UpcomingMeeting {
  id: string
  title: string
  start_time: string
  type: 'on-site' | 'online' | 'in-office'
  location?: string
  minutesUntil: number
}

interface MeetingNotificationBannerProps {
  meeting: UpcomingMeeting | null
  onDismiss: () => void
  onJoin?: () => void
}

export function MeetingNotificationBanner({ 
  meeting, 
  onDismiss,
  onJoin 
}: MeetingNotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (meeting) {
      setIsVisible(true)
    }
  }, [meeting])

  if (!meeting || !isVisible) return null

  const getUrgencyClass = (minutes: number) => {
    if (minutes <= 5) return 'bg-red-600' // BARDZO PILNE
    if (minutes <= 15) return 'bg-orange-500' // PILNE
    return 'bg-indigo-600' // Normalne
  }

  const getIcon = () => {
    switch (meeting.type) {
      case 'online': return <Video size={24} weight="fill" />
      case 'on-site': return <MapPin size={24} weight="fill" />
      default: return <Clock size={24} weight="fill" />
    }
  }

  const urgencyClass = getUrgencyClass(meeting.minutesUntil)

  return (
    <div className={`fixed top-0 left-0 right-0 z-[999] ${urgencyClass} text-white shadow-2xl animate-slideDown`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Icon + Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wide opacity-90">
                  {meeting.minutesUntil <= 5 ? '🚨 TERAZ!' : `Za ${meeting.minutesUntil} min`}
                </span>
                <span className="text-xs opacity-75">•</span>
                <span className="text-xs opacity-90">
                  {meeting.start_time}
                </span>
              </div>
              <h3 className="text-lg font-bold truncate">
                {meeting.title}
              </h3>
              {meeting.location && (
                <p className="text-sm opacity-90 truncate">
                  📍 {meeting.location}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {meeting.type === 'online' && onJoin && (
              <button
                onClick={onJoin}
                className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <Video size={18} weight="fill" />
                Dołącz
              </button>
            )}
            
            <button
              onClick={() => {
                setIsVisible(false)
                onDismiss()
              }}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
