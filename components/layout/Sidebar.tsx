'use client'

import { ListChecks, CalendarBlank, Notebook, Brain, HandHeart, GearSix } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Etap 2A: Updated assistant IDs to match specification
// Previous: 'todoist', 'planner', 'journal', '6hats', 'chat'
// Current: 'tasks', 'planning', 'journal', 'decisions', 'support'
export type AssistantId = 'tasks' | 'planning' | 'journal' | 'decisions' | 'support' | 'admin'

interface Assistant {
  id: AssistantId
  icon: any
  label: string
  color: string
  adminOnly?: boolean
}

const assistants: Assistant[] = [
  { id: 'tasks', icon: ListChecks, label: 'Zadania', color: 'text-blue-500' },
  { id: 'planning', icon: CalendarBlank, label: 'Planowanie', color: 'text-green-500' },
  { id: 'journal', icon: Notebook, label: 'Dziennik', color: 'text-purple-500' },
  { id: 'decisions', icon: Brain, label: 'Decyzje', color: 'text-orange-500' },
  { id: 'support', icon: HandHeart, label: 'Wsparcie', color: 'text-pink-500' },
  { id: 'admin', icon: GearSix, label: 'Panel Admina', color: 'text-red-500', adminOnly: true },
]

interface SidebarProps {
  activeView: AssistantId
  onNavigate: (view: AssistantId) => void
  isAdmin?: boolean
}

export default function Sidebar({ activeView, onNavigate, isAdmin }: SidebarProps) {
  return (
    <aside className="w-64 min-h-screen bg-white/50 backdrop-blur-sm border-r border-white/20 p-4">
      <nav className="space-y-2">
        {assistants.map((assistant, index) => {
          // Hide admin option if user is not admin
          if (assistant.adminOnly && !isAdmin) {
            return null
          }

          const Icon = assistant.icon
          const isActive = activeView === assistant.id
          const isFirstAdminItem = assistant.adminOnly && (index === 0 || !assistants[index - 1]?.adminOnly)
          
          return (
            <button
              key={assistant.id}
              onClick={() => onNavigate(assistant.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                'hover:bg-white/10',
                isActive && 'bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 border border-brand-purple/20',
                isFirstAdminItem && 'border-t border-gray-200 mt-4 pt-6'
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
