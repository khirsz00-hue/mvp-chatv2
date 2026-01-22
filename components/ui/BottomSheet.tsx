'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ isOpen, onClose, title, children, className }: BottomSheetProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragY, setDragY] = React.useState(0)

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false)
    setDragY(0)
    // Close if dragged down more than 100px
    if (info.offset.y > 100) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100]"
            style={{ touchAction: 'none' }}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300 
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onDrag={(event, info) => setDragY(info.offset.y)}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[101]',
              'bg-white rounded-t-3xl shadow-2xl',
              'max-h-[70vh] overflow-hidden',
              'pb-safe', // Tailwind safe area utility
              className
            )}
            style={{
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Drag Handle */}
            <div className="sticky top-0 bg-white pt-3 pb-2 px-4 flex flex-col items-center gap-2 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              
              {title && (
                <div className="w-full flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Zamknij"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(70vh-80px)] px-4 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
