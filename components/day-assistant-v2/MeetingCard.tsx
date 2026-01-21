/**
 * MeetingCard Component
 * 
 * Clickable meeting card with:
 * - Hover effects and border color changes
 * - Chevron icon indicating interactivity
 * - Meeting type icons (Online, On-site, In-office)
 * - Opens MeetingDetailsModal on click
 */

'use client'

import { useState } from 'react'
import { Video, MapPin, Users } from '@phosphor-icons/react'
import { MeetingDetailsModal } from './MeetingDetailsModal'

interface Meeting {
  id: string
  title: string
  start_time: string
  end_time?: string
  duration_minutes: number
  type: 'on-site' | 'online' | 'in-office'
  location?: string
  date: string
  description?: string
  metadata?: {
    description?: string | null
    attendees?: any[]
    hasVideoCall?: boolean
    platform?: string | null
    isAllDay?: boolean
  }
}

interface MeetingCardProps {
  meeting: Meeting
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const [showModal, setShowModal] = useState(false)

  const getIcon = () => {
    if (meeting.type === 'online') {
      return <Video size={16} weight="fill" className="text-indigo-600" />
    }
    if (meeting.type === 'on-site') {
      return <MapPin size={16} weight="fill" className="text-amber-600" />
    }
    return <Users size={16} weight="fill" className="text-slate-600" />
  }

  const getLabel = () => {
    if (meeting.type === 'online') return 'Online'
    if (meeting.type === 'on-site') return 'Wizyta'
    return 'Biuro'
  }

  const description = meeting.description || meeting.metadata?.description

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Time and duration */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-indigo-600">
                {meeting.start_time}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                {meeting.duration_minutes} min
              </span>
            </div>

            {/* Title */}
            <h3 className="font-bold text-slate-800 mb-1 truncate">
              {meeting.title}
            </h3>

            {/* Description */}
            {description && (
              <p className="text-sm text-slate-600 line-clamp-1 mb-2">
                {description}
              </p>
            )}

            {/* Type and location */}
            <div className="flex items-center gap-2 mt-2">
              {getIcon()}
              <span className="text-xs text-slate-600">{getLabel()}</span>
              {meeting.location && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600 truncate">
                    {meeting.location}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Chevron icon - indicates clickability */}
          <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-400 transition-colors" style={{ fontSize: '12px' }}></i>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <MeetingDetailsModal
          meeting={meeting}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
