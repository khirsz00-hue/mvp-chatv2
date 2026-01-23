'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ListChecks, CalendarBlank, Notebook, Brain, HandHeart, GearSix, Sun, Users, CalendarCheck, Sparkle, SunHorizon, UserCircle } from '@phosphor-icons/react'
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
  { id: 'account-settings', icon: UserCircle, label: 'Ustawienia konta', color: 'text-gray-700', href: '/profile' },
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
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Auto-collapse on tablet breakpoint (768px - 1023px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth
        setIsCollapsed(width >= 768 && width < 1024)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return (
    <aside className={cn(
      "h-screen bg-white/95 backdrop-blur-md border-r border-white/20 p-4 transition-all duration-300 ease-in-out",
      "lg:translate-x-0", // Always visible on large screens
      "fixed lg:relative top-0 left-0", // Fixed on mobile, relative on desktop
      "z-50 lg:z-auto",
      "overflow-y-auto", // Enable scroll if sidebar is taller than screen
      isCollapsed ? "w-16" : "w-64",
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
                'w-full flex items-center gap-3 rounded-xl transition-all',
                'hover:bg-white/10',
                isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                isActive && 'bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 border border-brand-purple/20',
                isFirstAdminItem && 'border-t border-gray-200 mt-4 pt-6'
              )}
              title={isCollapsed ? assistant.label : undefined}
            >
              <Icon size={24} className={assistant.color} weight={isActive ? 'fill' : 'regular'} />
              {!isCollapsed && (
                <span className={cn('font-medium', isActive && 'text-brand-purple')}>
                  {assistant.label}
                </span>
              )}
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
                  'w-full flex items-center gap-3 rounded-xl transition-all',
                  'hover:bg-white/10',
                  isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
                )}
                title={isCollapsed ? link.label : undefined}
              >
                <Icon size={24} className={link.color} weight="regular" />
                {!isCollapsed && (
                  <span className="font-medium">
                    {link.label}
                  </span>
                )}
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
