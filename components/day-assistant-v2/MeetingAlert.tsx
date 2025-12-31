'use client'

import Button from '@/components/ui/Button'
import { X } from '@phosphor-icons/react'
import { format } from 'date-fns'

interface Meeting {
  id: string
  title: string
  start_time: string
  end_time: string
  meeting_link?: string
}

interface MeetingAlertProps {
  meeting: Meeting
  minutesUntil: number
  onDismiss: () => void
}

export function MeetingAlert({ meeting, minutesUntil, onDismiss }: MeetingAlertProps) {
  const isCritical = minutesUntil <= 5
  
  return (
    <div className={`
      mb-4 p-4 rounded-lg border-2 animate-pulse
      ${isCritical 
        ? 'bg-red-100 border-red-500' 
        : 'bg-orange-100 border-orange-500'
      }
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">
              {isCritical ? '🔴' : '⚠️'}
            </span>
            <span className="text-lg font-bold">
              Za {minutesUntil} min: {meeting.title}
            </span>
          </div>
          <p className="text-sm text-gray-700">
            {format(new Date(meeting.start_time), 'HH:mm')} - {format(new Date(meeting.end_time), 'HH:mm')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {meeting.meeting_link && (
            <Button 
              onClick={() => window.open(meeting.meeting_link, '_blank')}
              className={isCritical ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Dołącz teraz
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onDismiss}
            className="min-w-0 px-2"
          >
            <X size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
