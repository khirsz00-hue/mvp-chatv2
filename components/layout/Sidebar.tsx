'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

export type AssistantId = 'todoist' | 'planner' | 'journal' | '6hats' | 'chat'

interface Assistant {
  id: AssistantId
  icon: string
  name: string
  description: string
}

const assistants: Assistant[] = [
  {
    id: 'todoist',
    icon: '📝',
    name: 'Todoist Helper',
    description: 'Zarządzaj zadaniami z AI',
  },
  {
    id: 'planner',
    icon: '📅',
    name: 'AI Planner',
    description: 'Inteligentne planowanie dnia',
  },
  {
    id: 'journal',
    icon: '📔',
    name: 'Journal',
    description: 'Codzienny dziennik refleksji',
  },
  {
    id: '6hats',
    icon: '🎩',
    name: 'Six Thinking Hats',
    description: 'Framework decyzyjny',
  },
  {
    id: 'chat',
    icon: '💬',
    name: 'Chat Support',
    description: 'Coaching dla ADHD',
  },
]

interface SidebarProps {
  activeAssistant: AssistantId
  onAssistantChange: (id: AssistantId) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({
  activeAssistant,
  onAssistantChange,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={onToggleCollapse}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-lg glass hover:bg-brand-purple/10 transition-colors"
      >
        {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          glass-dark border-r border-white/10 min-h-[calc(100vh-4rem)]
          transition-all duration-300 ease-in-out
          fixed lg:relative top-16 lg:top-0 left-0 h-full z-30
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-64' : 'translate-x-0 w-64'}
        `}
      >
        <div className="p-4 space-y-2">
          {assistants.map((assistant) => {
            const isActive = activeAssistant === assistant.id
            
            return (
              <motion.button
                key={assistant.id}
                onClick={() => onAssistantChange(assistant.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200
                  hover:scale-105 active:scale-95
                  ${
                    isActive
                      ? 'bg-brand-purple/20 shadow-glow'
                      : 'hover:bg-brand-purple/10'
                  }
                `}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">{assistant.icon}</span>
                <div className="text-left flex-1">
                  <div
                    className={`font-semibold ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-200'
                    }`}
                  >
                    {assistant.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {assistant.description}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20 top-16"
          onClick={onToggleCollapse}
        />
      )}
    </>
  )
}

export { assistants }
export type { Assistant }
