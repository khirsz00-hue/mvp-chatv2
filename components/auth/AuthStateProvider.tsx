'use client'

import { useEffect } from 'react'
import { initAuthStateListener } from '@/lib/authStateManager'

/**
 * Auth State Provider
 * 
 * Client component that initializes auth state management
 * Must be rendered in the root layout to ensure cookies are properly synced
 */
export function AuthStateProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAuthStateListener()
  }, [])

  return <>{children}</>
}
