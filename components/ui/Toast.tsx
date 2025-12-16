'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { X, CheckCircle, WarningCircle, Info, WarningOctagon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Dedupe cleanup delay: time before allowing same toast to appear again (ms)
const TOAST_DEDUP_CLEANUP_DELAY = 10000 // 10 seconds

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [activeMessages, setActiveMessages] = useState<Set<string>>(new Set())
  const [cleanupTimers, setCleanupTimers] = useState<Map<string, NodeJS.Timeout>>(new Map())

  const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    // Dedupe: prevent duplicate toasts for the same message within cleanup delay
    const messageKey = `${type}:${message}`
    if (activeMessages.has(messageKey)) {
      console.log('[Toast] Skipping duplicate toast:', message)
      return
    }
    
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const newToast: Toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, newToast])
    setActiveMessages(prev => new Set([...prev, messageKey]))

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
        // Remove from active messages after cleanup delay to allow future toasts
        const cleanupTimer = setTimeout(() => {
          setActiveMessages(prev => {
            const next = new Set(prev)
            next.delete(messageKey)
            return next
          })
          setCleanupTimers(prev => {
            const next = new Map(prev)
            next.delete(messageKey)
            return next
          })
        }, TOAST_DEDUP_CLEANUP_DELAY)
        
        // Store cleanup timer for potential cleanup on unmount
        setCleanupTimers(prev => new Map([...prev, [messageKey, cleanupTimer]]))
      }, duration)
    }
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cleanupTimers.forEach(timer => clearTimeout(timer))
    }
  }, [cleanupTimers])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const icons = {
    success: <CheckCircle size={20} weight="bold" />,
    error: <WarningOctagon size={20} weight="bold" />,
    warning: <WarningCircle size={20} weight="bold" />,
    info: <Info size={20} weight="bold" />
  }

  const styles = {
    success: 'bg-green-50 border-green-500 text-green-900',
    error: 'bg-red-50 border-red-500 text-red-900',
    warning: 'bg-orange-50 border-orange-500 text-orange-900',
    info: 'bg-blue-50 border-blue-500 text-blue-900'
  }

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-orange-600',
    info: 'text-blue-600'
  }

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg min-w-[300px] max-w-md transition-all duration-300',
        styles[toast.type],
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      )}
    >
      <div className={iconColors[toast.type]}>
        {icons[toast.type]}
      </div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Close"
      >
        <X size={18} weight="bold" />
      </button>
    </div>
  )
}
