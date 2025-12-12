'use client'

import { ListChecks, CalendarBlank, Notebook, Brain, HandHeart } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type AssistantId = 'tasks' | 'planning' | 'journal' | 'decisions' | 'support'

interface Assistant {
  id: AssistantId
  icon: any
  label: string
  color: string
}

const assistants: Assistant[] = [
  { id: 'tasks', icon: ListChecks, label: 'Zadania', color: 'text-blue-500' },
  { id: 'planning', icon: CalendarBlank, label: 'Planowanie', color: 'text-green-500' },
  { id: 'journal', icon: Notebook, label: 'Dziennik', color: 'text-purple-500' },
  { id: 'decisions', icon: Brain, label: 'Decyzje', color: 'text-orange-500' },
  { id: 'support', icon: HandHeart, label: 'Wsparcie', color: 'text-pink-500' },
]

interface SidebarProps {
  activeView: AssistantId
  onNavigate: (view: AssistantId) => void
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 min-h-screen bg-white/50 backdrop-blur-sm border-r border-white/20 p-4">
      <nav className="space-y-2">
        {assistants.map((assistant) => {
          const Icon = assistant.icon
          const isActive = activeView === assistant.id
          
          return (
            <button
              key={assistant.id}
              onClick={() => onNavigate(assistant.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                'hover:bg-white/10',
                isActive && 'bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 border border-brand-purple/20'
              )}
            >
              <Icon size={24} className={assistant.color} weight={isActive ? 'fill' : 'regular'} />
              <span className={cn('font-medium', isActive && 'text-brand-purple')}>
                {assistant.label}
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export { assistants }
export type { Assistant }
