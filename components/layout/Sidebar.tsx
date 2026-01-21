'use client'

import { useRouter } from 'next/navigation'
import { ListChecks, CalendarBlank, Notebook, Brain, HandHeart, GearSix, Sun, Users, CalendarCheck, Sparkle, SunHorizon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Updated assistant IDs - removed old 'day-assistant' v1, keeping only v2
export type AssistantId = 'tasks' | 'day-assistant-v2' | 'planning' | 'journal' | 'decisions' | 'community' | 'support' | 'admin'

interface Assistant {
  id: AssistantId
  icon: any
  label: string
  color: string
  adminOnly?: boolean
  href?: string  // Optional external route
}

const assistants: Assistant[] = [
  { id: 'tasks', icon: ListChecks, label: 'Zadania', color: 'text-blue-500' },
  { id: 'day-assistant-v2', icon: CalendarCheck, label: 'Asystent Dnia', color: 'text-amber-500' },
  { id: 'planning', icon: CalendarBlank, label: 'Asystent Tygodnia', color: 'text-green-500' },
  { id: 'journal', icon: Notebook, label: 'Dziennik', color: 'text-purple-500' },
  { id: 'decisions', icon: Brain, label: 'Decyzje', color: 'text-orange-500' },
  { id: 'community', icon: Users, label: 'Społeczność', color: 'text-teal-500' },
  { id: 'support', icon: HandHeart, label: 'Wsparcie', color: 'text-pink-500' },
  { id: 'admin', icon: GearSix, label: 'Panel Admina', color: 'text-red-500', adminOnly: true },
]

// Separate navigation links that go to external routes
const externalLinks = [
  { id: 'ai-insights', icon: Sparkle, label: 'AI Insights', color: 'text-purple-500', href: '/ai-insights' },
  { id: 'morning-brief', icon: SunHorizon, label: 'Poranny Brief', color: 'text-amber-500', href: '/morning-brief' }
]

interface SidebarProps {
  activeView: AssistantId
  onNavigate: (view: AssistantId) => void
  isAdmin?: boolean
  isMobileMenuOpen?: boolean
  onClose?: () => void  // NEW PROP
}

export default function Sidebar({ activeView, onNavigate, isAdmin, isMobileMenuOpen, onClose }: SidebarProps) {
  const router = useRouter()
  
  return (
    <aside className={cn(
      "w-64 h-screen bg-white/95 backdrop-blur-md border-r border-white/20 p-4 transition-transform duration-300 ease-in-out",
      "lg:translate-x-0", // Always visible on large screens
      "fixed lg:relative top-0 left-0", // Fixed on mobile, relative on desktop
      "z-50 lg:z-auto",
      "overflow-y-auto", // Enable scroll if sidebar is taller than screen
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
        
        {/* External navigation links */}
        <div className="border-t border-gray-200 mt-4 pt-4">
          {externalLinks.map((link) => {
            const Icon = link.icon
            
            return (
              <button
                key={link.id}
                onClick={() => {
                  router.push(link.href)
                  onClose?.() // Close sidebar on mobile
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  'hover:bg-white/10'
                )}
              >
                <Icon size={24} className={link.color} weight="regular" />
                <span className="font-medium">
                  {link.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}

// Helper to validate assistant IDs
export function isValidAssistantId(id: string): id is AssistantId {
  const validIds: AssistantId[] = ['tasks', 'day-assistant-v2', 'planning', 'journal', 'decisions', 'community', 'support', 'admin']
  return validIds.includes(id as AssistantId)
}

export { assistants }
export type { Assistant }
