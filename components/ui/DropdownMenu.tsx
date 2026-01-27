'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'

export interface DropdownMenuProps {
  children: React.ReactNode
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuContextType {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null }
})

export interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ asChild, children }, ref) => {
    const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext)

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      setOpen(!open)
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<React.HTMLProps<HTMLElement>>, {
        ref: (node: HTMLElement) => {
          (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node
          if (typeof ref === 'function') ref(node as any)
          else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node as any
        },
        onClick: handleClick
      })
    }

    return (
      <button ref={ref} onClick={handleClick}>
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

export interface DropdownMenuContentProps {
  align?: 'start' | 'end' | 'center'
  side?: 'top' | 'bottom'
  sideOffset?: number
  collisionPadding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  avoidCollisions?: boolean
  className?: string
  children: React.ReactNode
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  align = 'end',
  side = 'bottom',
  sideOffset = 5,
  collisionPadding = 20,
  avoidCollisions = true,
  className = '',
  children
}) => {
  const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [computedSide, setComputedSide] = React.useState<'top' | 'bottom'>(side)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  // Calculate position based on trigger
  React.useEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const triggerRect = trigger.getBoundingClientRect()
      let top = triggerRect.bottom + sideOffset
      let left = triggerRect.right

      // Adjust for alignment
      if (contentRef.current) {
        const contentWidth = contentRef.current.offsetWidth
        
        if (align === 'end') {
          left = triggerRect.right - contentWidth
        } else if (align === 'start') {
          left = triggerRect.left
        } else if (align === 'center') {
          left = triggerRect.left + (triggerRect.width / 2) - (contentWidth / 2)
        }
      }

      // Adjust for side
      if (computedSide === 'top') {
        top = triggerRect.top - sideOffset
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, computedSide, align, sideOffset, triggerRef])

  // Handle collision detection
  React.useEffect(() => {
    if (!open || !avoidCollisions || !contentRef.current) return

    const checkCollision = () => {
      const content = contentRef.current
      if (!content) return

      const rect = content.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // Get collision padding values
      const padding = typeof collisionPadding === 'number' 
        ? { top: collisionPadding, right: collisionPadding, bottom: collisionPadding, left: collisionPadding }
        : { 
            top: collisionPadding.top || 0, 
            right: collisionPadding.right || 0, 
            bottom: collisionPadding.bottom || 0, 
            left: collisionPadding.left || 0 
          }

      // Check if menu would clip at bottom
      const wouldClipBottom = rect.bottom > viewportHeight - padding.bottom
      // Check if menu would clip at top
      const wouldClipTop = rect.top < padding.top

      // Determine best side
      if (side === 'bottom' && wouldClipBottom && !wouldClipTop) {
        setComputedSide('top')
      } else if (side === 'top' && wouldClipTop && !wouldClipBottom) {
        setComputedSide('bottom')
      } else {
        setComputedSide(side)
      }
    }

    // Check immediately and on scroll/resize
    checkCollision()
    window.addEventListener('scroll', checkCollision, true)
    window.addEventListener('resize', checkCollision)

    return () => {
      window.removeEventListener('scroll', checkCollision, true)
      window.removeEventListener('resize', checkCollision)
    }
  }, [open, avoidCollisions, side, collisionPadding])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  const alignmentClass = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  }[align]

  // Position menu above or below trigger based on collision detection
  const positionClass = computedSide === 'top' 
    ? 'bottom-full' 
    : 'top-full'

  // Animation direction based on side
  const initialY = computedSide === 'top' ? 10 : -10
  const animateY = 0

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.95, y: initialY }}
          animate={{ opacity: 1, scale: 1, y: animateY }}
          exit={{ opacity: 0, scale: 0.95, y: initialY }}
          transition={{ duration: 0.1 }}
          className={`fixed z-[9999] min-w-[12rem] rounded-lg bg-white border border-gray-200 shadow-lg ${className}`}
          style={{
            top: computedSide === 'bottom' ? position.top : position.top - (contentRef.current?.offsetHeight || 0),
            left: position.left,
          }}
        >
          <div className="p-1">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null
}

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className = '', onClick, children, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownMenuContext)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onClick?.(e)
      setOpen(false)
    }

    return (
      <button
        ref={ref}
        className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 ${className}`}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

export interface DropdownMenuSeparatorProps {
  className?: string
}

export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps> = ({ className = '' }) => {
  return <div className={`my-1 h-px bg-gray-200 ${className}`} />
}

export interface DropdownMenuLabelProps {
  className?: string
  children: React.ReactNode
}

export const DropdownMenuLabel: React.FC<DropdownMenuLabelProps> = ({ className = '', children }) => {
  return (
    <div className={`px-3 py-2 text-xs font-semibold text-gray-500 ${className}`}>
      {children}
    </div>
  )
}
