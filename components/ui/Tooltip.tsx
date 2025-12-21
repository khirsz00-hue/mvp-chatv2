'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface TooltipProviderProps {
  children: React.ReactNode
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>
}

export interface TooltipProps {
  children: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLElement>(null)

  return (
    <TooltipContext.Provider value={{ open, setOpen, position, setPosition, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  )
}

interface TooltipContextType {
  open: boolean
  setOpen: (open: boolean) => void
  position: { top: number; left: number }
  setPosition: (position: { top: number; left: number }) => void
  triggerRef: React.RefObject<HTMLElement>
}

const TooltipContext = React.createContext<TooltipContextType>({
  open: false,
  setOpen: () => {},
  position: { top: 0, left: 0 },
  setPosition: () => {},
  triggerRef: { current: null }
})

export interface TooltipTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
  ({ asChild, children }, ref) => {
    const { setOpen, setPosition, triggerRef } = React.useContext(TooltipContext)

    const handleMouseEnter = (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setPosition({
        top: rect.top,
        left: rect.left + rect.width / 2
      })
      setOpen(true)
    }

    const handleMouseLeave = () => {
      setOpen(false)
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<React.HTMLProps<HTMLElement>>, {
        ref: triggerRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave
      })
    }

    return (
      <div
        ref={triggerRef as React.RefObject<HTMLDivElement>}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    )
  }
)
TooltipTrigger.displayName = 'TooltipTrigger'

export interface TooltipContentProps {
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  children: React.ReactNode
}

export const TooltipContent: React.FC<TooltipContentProps> = ({
  side = 'top',
  className = '',
  children
}) => {
  const { open, position } = React.useContext(TooltipContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [contentPosition, setContentPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    if (open && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      const offset = 8

      let top = position.top
      let left = position.left

      switch (side) {
        case 'top':
          top = position.top - rect.height - offset
          left = position.left - rect.width / 2
          break
        case 'bottom':
          top = position.top + offset
          left = position.left - rect.width / 2
          break
        case 'left':
          top = position.top - rect.height / 2
          left = position.left - rect.width - offset
          break
        case 'right':
          top = position.top - rect.height / 2
          left = position.left + offset
          break
      }

      // Ensure tooltip stays within viewport
      const padding = 8
      if (left < padding) left = padding
      if (left + rect.width > window.innerWidth - padding) {
        left = window.innerWidth - rect.width - padding
      }
      if (top < padding) top = padding
      if (top + rect.height > window.innerHeight - padding) {
        top = window.innerHeight - rect.height - padding
      }

      setContentPosition({ top, left })
    }
  }, [open, position, side])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`fixed z-[100] rounded-lg bg-gray-900 text-white px-3 py-2 text-sm shadow-lg pointer-events-none ${className}`}
          style={{
            top: contentPosition.top,
            left: contentPosition.left
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
