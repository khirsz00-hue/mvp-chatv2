'use client'

import { useEffect } from 'react'
import { initPWAGestureControl } from '@/lib/pwaGestureControl'

/**
 * Client component that initializes PWA gesture controls
 * Prevents pull-to-refresh, pinch-to-zoom, and other unwanted gestures
 */
export function PWAGestureHandler() {
  useEffect(() => {
    // Initialize PWA gesture controls
    const cleanup = initPWAGestureControl()
    
    // Cleanup on unmount
    return cleanup
  }, [])

  // This component doesn't render anything
  return null
}
