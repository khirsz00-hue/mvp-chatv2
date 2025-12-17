'use client'

import { ListChecks, CalendarBlank, Notebook, Brain, HandHeart, GearSix, Sun, Users, CalendarCheck } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Updated assistant IDs to include Day Assistant and Community
export type AssistantId = 'tasks' | 'day-assistant' | 'day-assistant-v2' | 'planning' | 'journal' | 'decisions' | 'community' | 'support' | 'admin'

interface Assistant {
  id: AssistantId
  icon: any
  label: string
  color: string
  adminOnly?: boolean
}

const assistants: Assistant[] = [
  { id: 'tasks', icon: ListChecks, label: 'Zadania', color: 'text-blue-500' },
  { id: 'day-assistant', icon: Sun, label: 'Asystent Dnia', color: 'text-yellow-500' },
  { id: 'day-assistant-v2', icon: CalendarCheck, label: 'Asystent Dnia v2', color: 'text-amber-500' },
  { id: 'planning', icon: CalendarBlank, label: 'Asystent Tygodnia', color: 'text-green-500' },
  { id: 'journal', icon: Notebook, label: 'Dziennik', color: 'text-purple-500' },
  { id: 'decisions', icon: Brain, label: 'Decyzje', color: 'text-orange-500' },
  { id: 'community', icon: Users, label: 'Społeczność', color: 'text-teal-500' },
  { id: 'support', icon: HandHeart, label: 'Wsparcie', color: 'text-pink-500' },
  { id: 'admin', icon: GearSix, label: 'Panel Admina', color: 'text-red-500', adminOnly: true },
]

interface SidebarProps {
  activeView: AssistantId
  onNavigate: (view: AssistantId) => void
  isAdmin?: boolean
  isMobileMenuOpen?: boolean
}

export default function Sidebar({ activeView, onNavigate, isAdmin, isMobileMenuOpen }: SidebarProps) {
  return (
    <aside className={cn(
      "w-64 min-h-screen bg-white/50 backdrop-blur-sm border-r border-white/20 p-4 transition-transform duration-300 ease-in-out",
      "lg:translate-x-0", // Always visible on large screens
      "fixed lg:relative z-50 lg:z-auto", // Fixed on mobile, relative on desktop
      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0" // Slide in/out on mobile
    )}>
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
