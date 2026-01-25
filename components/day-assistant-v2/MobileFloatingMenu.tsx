'use client'

import { useState } from 'react'
import { Plus, ChatCircle, Microphone, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileFloatingMenuProps {
  onAddTask: () => void
  onOpenChat: () => void
  onOpenVoice: () => void
}

export function MobileFloatingMenu({ onAddTask, onOpenChat, onOpenVoice }: MobileFloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    {
      icon: Plus,
      label: 'Dodaj zadanie',
      color: 'from-purple-600 to-pink-600',
      onClick: onAddTask,
      shortcut: 'Shift+Q'
    },
    {
      icon: ChatCircle,
      label: 'Czat z AI',
      color: 'from-cyan-600 to-blue-600',
      onClick: onOpenChat,
      shortcut: 'Shift+C'
    },
    {
      icon: Microphone,
      label: 'Dyktuj zadania',
      color: 'from-blue-600 to-indigo-600',
      onClick: onOpenVoice,
      shortcut: '🎤'
    }
  ]

  const handleItemClick = (onClick: () => void) => {
    onClick()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Main button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Menu"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={28} weight="bold" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus size={28} weight="bold" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Menu items - vertical stack layout below the main button */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu items stacked vertically */}
            <div className="absolute bottom-20 right-0 z-40 flex flex-col gap-3">
              {menuItems.map((item, index) => {
                const Icon = item.icon

                return (
                  <motion.button
                    key={item.label}
                    onClick={() => handleItemClick(item.onClick)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r ${item.color} text-white shadow-lg hover:shadow-xl transition-shadow h-12`}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0
                    }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{
                      delay: index * 0.05,
                      type: 'spring',
                      stiffness: 300,
                      damping: 25
                    }}
                    title={item.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon size={20} weight="bold" />
                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
