/**
 * MeetingDetailsModal Component
 * 
 * Shows detailed information about a meeting:
 * - Meeting title, time, duration
 * - Type (online/on-site/in-office) with appropriate icons
 * - Location/link
 * - Description
 * - Attendees list
 * - Action buttons (Join meeting, Edit reminders, Close)
 */

'use client'

import { useState } from 'react'
import { X, Video, MapPin, Users, Clock, CalendarBlank, Bell } from '@phosphor-icons/react'
import { MeetingReminderModal } from './MeetingReminderModal'

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
    attendees?: Array<{
      email?: string
      displayName?: string
      responseStatus?: string
      self?: boolean
    }>
    hasVideoCall?: boolean
    platform?: string | null
    isAllDay?: boolean
  }
}

interface MeetingDetailsModalProps {
  meeting: Meeting
  onClose: () => void
}

export function MeetingDetailsModal({ meeting, onClose }: MeetingDetailsModalProps) {
  const [showReminderModal, setShowReminderModal] = useState(false)

  const getTypeIcon = () => {
    if (meeting.type === 'online') {
      return <Video size={24} weight="fill" className="text-indigo-600" />
    }
    if (meeting.type === 'on-site') {
      return <MapPin size={24} weight="fill" className="text-amber-600" />
    }
    return <Users size={24} weight="fill" className="text-slate-600" />
  }

  const getTypeLabel = () => {
    if (meeting.type === 'online') return 'Spotkanie online'
    if (meeting.type === 'on-site') return 'Wizyta (wyjazd)'
    return 'Spotkanie w biurze'
  }

  const getTypeBgColor = () => {
    if (meeting.type === 'online') return 'bg-indigo-50 border-indigo-200'
    if (meeting.type === 'on-site') return 'bg-amber-50 border-amber-200'
    return 'bg-slate-50 border-slate-200'
  }

  const description = meeting.description || meeting.metadata?.description
  const attendees = meeting.metadata?.attendees || []
  const platform = meeting.metadata?.platform

  const handleJoinMeeting = () => {
    if (meeting.location) {
      window.open(meeting.location, '_blank')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {meeting.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={16} weight="fill" />
                <span className="font-semibold">{meeting.start_time}</span>
                <span>•</span>
                <span>{meeting.duration_minutes} min</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Type Badge */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${getTypeBgColor()}`}>
              {getTypeIcon()}
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{getTypeLabel()}</div>
                {platform && (
                  <div className="text-sm text-slate-600">{platform}</div>
                )}
              </div>
            </div>

            {/* Location/Link */}
            {meeting.location && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">
                  {meeting.type === 'online' ? 'Link do spotkania' : 'Lokalizacja'}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <a
                    href={meeting.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline break-all"
                  >
                    {meeting.location}
                  </a>
                </div>
              </div>
            )}

            {/* Description */}
            {description && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">Opis</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">
                  {description}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">Data</div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CalendarBlank size={16} weight="fill" />
                <span>{new Date(meeting.date).toLocaleDateString('pl-PL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            </div>

            {/* Attendees */}
            {attendees.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">
                  Uczestniczy ({attendees.length})
                </div>
                <div className="space-y-2">
                  {attendees.map((attendee, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {(attendee.displayName || attendee.email)?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {attendee.displayName || attendee.email}
                        </div>
                        {attendee.displayName && attendee.email && (
                          <div className="text-xs text-slate-500 truncate">
                            {attendee.email}
                          </div>
                        )}
                      </div>
                      {attendee.responseStatus && (
                        <div className="flex-shrink-0">
                          {attendee.responseStatus === 'accepted' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              ✓ Akceptuje
                            </span>
                          )}
                          {attendee.responseStatus === 'declined' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                              ✗ Odrzucił
                            </span>
                          )}
                          {attendee.responseStatus === 'tentative' && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                              ? Być może
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADHD Tip for on-site meetings */}
            {meeting.type === 'on-site' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    💡
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-amber-900 mb-1">
                      Podpowiedź ADHD
                    </div>
                    <div className="text-sm text-amber-800">
                      Dla wizyt fizycznych zalecamy przypomnienie <strong>40 minut przed</strong> - 
                      daje to czas na dojazd i przygotowanie. Możesz dostosować to w ustawieniach przypomnień.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowReminderModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Bell size={18} weight="fill" />
              Dostosuj przypomnienia
            </button>
            <div className="flex items-center gap-3">
              {meeting.type === 'online' && meeting.location && (
                <button
                  onClick={handleJoinMeeting}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Video size={18} weight="fill" />
                  Dołącz do spotkania
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Modal */}
      {showReminderModal && (
        <MeetingReminderModal
          meeting={meeting}
          onClose={() => setShowReminderModal(false)}
        />
      )}
    </>
  )
}
