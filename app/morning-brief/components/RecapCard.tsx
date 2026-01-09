'use client'

import Card from '@/components/ui/Card'
import { CheckCircle, Clock } from '@phosphor-icons/react'

interface Task {
  id: string
  content: string
  priority: number
  due?: { date: string } | null
  completed?: boolean
}

interface RecapCardProps {
  title: string
  subtitle?: string
  tasks: Task[]
  icon: 'yesterday' | 'today'
  className?: string
}

export default function RecapCard({ title, subtitle, tasks, icon, className = '' }: RecapCardProps) {
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
    </Card>
  )
}
