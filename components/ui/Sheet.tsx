'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface SheetProps extends DialogPrimitive.DialogProps {
  side?: 'left' | 'right' | 'bottom'
  className?: string
  contentClassName?: string
}

export function Sheet({ children, ...props }: SheetProps) {
  return (
    <DialogPrimitive.Root {...props}>
      {children}
    </DialogPrimitive.Root>
  )
}

export const SheetTrigger = DialogPrimitive.Trigger

export function SheetContent({
  side = 'right',
  className,
  contentClassName,
  children,
  ...props
}: DialogPrimitive.DialogContentProps & { side?: 'left' | 'right' | 'bottom'; contentClassName?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        {...props}
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-xl',
          side === 'right' && 'top-0 right-0 h-full w-full sm:max-w-md animate-in slide-in-from-right',
          side === 'left' && 'top-0 left-0 h-full w-full sm:max-w-md animate-in slide-in-from-left',
          side === 'bottom' && 'left-0 right-0 bottom-0 w-full rounded-t-2xl animate-in slide-in-from-bottom',
          className
        )}
      >
        <div className={cn('flex-1 overflow-auto', contentClassName)}>
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
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

export const SheetClose = DialogPrimitive.Close
