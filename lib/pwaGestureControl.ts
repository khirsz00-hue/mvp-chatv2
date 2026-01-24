/**
 * PWA Gesture Control
 * Prevents unwanted browser gestures in PWA mode
 * - Pull-to-refresh
 * - Pinch-to-zoom
 * - Rubber band effect on iOS
 */

export function initPWAGestureControl() {
  if (typeof window === 'undefined') return

  // Prevent pull-to-refresh gesture
  let lastTouchY = 0
  let preventPullToRefresh = false

  const touchStartHandler = (e: TouchEvent) => {
    // Prevent pinch-to-zoom (multiple touches)
    if (e.touches.length > 1) {
      e.preventDefault()
      return
    }
    
    if (e.touches.length !== 1) return
    lastTouchY = e.touches[0].clientY
    
    // Detect if we're at the top of the page
    preventPullToRefresh = window.scrollY === 0
  }

  const touchMoveHandler = (e: TouchEvent) => {
    // Safety check
    if (e.touches.length === 0) return
    
    const touchY = e.touches[0].clientY
    const touchYDelta = touchY - lastTouchY
    lastTouchY = touchY

    // If pulling down at the top of the page, prevent default
    if (preventPullToRefresh && touchYDelta > 0) {
      e.preventDefault()
    }
  }

  // Prevent double-tap zoom
  let lastTouchEnd = 0
  const touchEndHandler = (e: TouchEvent) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }

  // Prevent context menu on long press (optional)
  const contextMenuHandler = (e: Event) => {
    // Allow context menu on development mode
    if (process.env.NODE_ENV === 'development') return
    e.preventDefault()
  }

  // Prevent wheel zoom (Ctrl+scroll)
  const wheelHandler = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
    }
  }

  // Add event listeners
  document.addEventListener('touchstart', touchStartHandler, { passive: false })
  document.addEventListener('touchmove', touchMoveHandler, { passive: false })
  document.addEventListener('touchend', touchEndHandler, { passive: false })
  document.addEventListener('contextmenu', contextMenuHandler, { passive: false })
  document.addEventListener('wheel', wheelHandler, { passive: false })

  // Return cleanup function
  return () => {
    document.removeEventListener('touchstart', touchStartHandler)
    document.removeEventListener('touchmove', touchMoveHandler)
    document.removeEventListener('touchend', touchEndHandler)
    document.removeEventListener('contextmenu', contextMenuHandler)
    document.removeEventListener('wheel', wheelHandler)
  }
}

/**
 * Check if app is running in PWA mode
 */
export function isPWAMode(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if running in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  
  // Check for iOS standalone
  interface NavigatorStandalone {
    standalone?: boolean
  }
  const isIOSStandalone = (window.navigator as NavigatorStandalone).standalone === true
  
  // Check for Android TWA
  const isAndroidTWA = document.referrer.includes('android-app://')
  
  return isStandalone || isIOSStandalone || isAndroidTWA
}
