'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import Header from '@/components/layout/Header'
import Sidebar, { AssistantId } from '@/components/layout/Sidebar'

interface CommunityLayoutProps {
  children: ReactNode
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Timeout zabezpieczający - wymusza zakończenie loading po 10 sekundach
    const timeoutId = setTimeout(() => {
      console.error('⏱️ [CommunityLayout] TIMEOUT - forcing loading to false after 10 seconds')
      setLoading(false)
    }, 10000) // 10 sekund

    // Check authentication
    const checkAuth = async () => {
      console.log('🔍 [CommunityLayout] checkAuth started')
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('🔍 [CommunityLayout] User:', user?.id || 'NULL')
        console.log('🔍 [CommunityLayout] User error:', userError)
        
        if (!user) {
          console.log('⚠️ [CommunityLayout] No user found, redirecting to login')
          setLoading(false)
          router.push('/login')
          return
        }
        
        console.log('✅ [CommunityLayout] User found:', user.email)
        setUser(user)

        // Check if user is admin
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        console.log('🔍 [CommunityLayout] Profile:', profile)
        console.log('🔍 [CommunityLayout] Profile error:', error)

        if (error) {
          console.error('Error fetching user profile:', error)
          setIsAdmin(false)
        } else {
          setIsAdmin(profile?.is_admin ?? false)
        }
      } catch (error) {
        console.error('❌ [CommunityLayout] Error in checkAuth:', error)
        setLoading(false)
      } finally {
        console.log('✅ [CommunityLayout] Setting loading to false')
        setLoading(false)
      }
    }

    checkAuth()

    // Cleanup timeout
    return () => {
      clearTimeout(timeoutId)
    }
  }, [router])

  const handleNavigate = (view: AssistantId) => {
    if (view === 'community') {
      // Already in community, do nothing
      setIsMobileMenuOpen(false)
      return
    }
    
    // Navigate to home and set the active assistant
    try { 
      localStorage.setItem('active_assistant', view) 
    } catch {}
    
    setIsMobileMenuOpen(false)
    router.push('/')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-x-hidden">
      <Header 
        user={user ? { email: user.email, name: user.user_metadata?.full_name } : null}
        onSignOut={handleSignOut}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex relative">
        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        
        <Sidebar 
          activeView="community" 
          onNavigate={handleNavigate} 
          isAdmin={isAdmin}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
