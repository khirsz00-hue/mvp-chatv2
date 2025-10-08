'use client'
import { useState, useEffect } from 'react'

export function useToasts() {
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  return {
    toast,
    showToast: (msg: string) => setToast(msg),
    ToastComponent: () =>
      toast ? (
        <div className="toast">
          {toast}
        </div>
      ) : null
  }
}
