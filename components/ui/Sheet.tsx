'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SheetProps {
  side?: 'left' | 'right' | 'bottom'
  className?: string
  contentClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Sheet({ children, ...props }: SheetProps) {
  return (
    <div {...props}>
      {children}
    </div>
  )
}

export const SheetTrigger = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <button onClick={onClick}>
    {children}
  </button>
)

export function SheetContent({
  side = 'right',
  className,
  contentClassName,
  children,
  ...props
}: { side?: 'left' | 'right' | 'bottom'; contentClassName?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-white shadow-xl',
        side === 'right' && 'top-0 right-0 h-full w-full sm:max-w-md',
        side === 'left' && 'top-0 left-0 h-full w-full sm:max-w-md',
        side === 'bottom' && 'left-0 right-0 bottom-0 w-full rounded-t-2xl',
        className
      )}
    >
      <div className={cn('flex-1 overflow-auto', contentClassName)}>
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          aria-label="Zamknij"
        >
          Zamknij
        </button>
      )}
    </div>
  )
}

export const SheetClose = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <button onClick={onClick} className="text-gray-500 hover:text-gray-700 text-sm font-medium">
    {children}
  </button>
)
