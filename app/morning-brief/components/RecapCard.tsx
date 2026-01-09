'use client'

import Card from '@/components/ui/Card'
import { CheckCircle, Clock, CalendarCheck } from '@phosphor-icons/react'
import { format } from 'date-fns'

interface Task {
  id: string
  content: string
  priority: number
  due?: { date: string } | null
  completed?: boolean
}

interface Meeting {
  id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  location?: string
  meeting_link?: string
}

interface RecapCardProps {
  title: string
  subtitle?: string
  tasks: Task[]
  icon: 'yesterday' | 'today'
  className?: string
  meetings?: Meeting[]
}

export default function RecapCard({ title, subtitle, tasks, icon, className = '', meetings }: RecapCardProps) {
  const Icon = icon === 'yesterday' ? CheckCircle : Clock

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon size={28} className={icon === 'yesterday' ? 'text-green-500' : 'text-amber-500'} weight="fill" />
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-500 italic">
          {icon === 'yesterday' ? 'Brak ukończonych zadań wczoraj' : 'Brak zadań na dziś'}
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div 
                className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  task.priority === 1 ? 'bg-red-500' :
                  task.priority === 2 ? 'bg-orange-500' :
                  task.priority === 3 ? 'bg-blue-500' :
                  'bg-gray-400'
                }`}
              />
              <div className="flex-1">
                <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                  {task.content}
                </p>
                {task.due?.date && (
                  <p className="text-xs text-gray-500 mt-1">
                    {task.due.date}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Meetings Section - only show for today */}
      {icon === 'today' && meetings && meetings.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CalendarCheck size={18} weight="fill" className="text-blue-600" />
            Spotkania dziś ({meetings.length})
          </h4>
          
          {/* Show first meeting */}
          <div className="bg-blue-50 rounded-lg p-4 mb-2">
            <p className="text-sm font-medium text-blue-900 mb-1">
              {format(new Date(meetings[0].start_time), 'HH:mm')} - {meetings[0].title}
            </p>
            {meetings[0].duration_minutes && (
              <p className="text-xs text-blue-700">
                {meetings[0].duration_minutes} min
                {meetings[0].location && ` • ${meetings[0].location}`}
              </p>
            )}
            {meetings[0].meeting_link && (
              <a 
                href={meetings[0].meeting_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
              >
                Link do spotkania →
              </a>
            )}
          </div>
          
          {meetings.length > 1 && (
            <p className="text-xs text-gray-500 mt-2">
              + {meetings.length - 1} {meetings.length === 2 ? 'spotkanie więcej' : 'spotkań więcej'}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
