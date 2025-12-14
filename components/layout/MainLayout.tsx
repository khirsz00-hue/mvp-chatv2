'use client'

import Header from './Header'
import Sidebar, { AssistantId } from './Sidebar'
import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { TasksAssistant } from '@/components/assistant/TasksAssistant'
import { JournalAssistantWrapper } from '@/components/journal/JournalAssistantWrapper'
import { DecisionAssistant } from '@/src/features/decision-assistant/components/DecisionAssistant'
import SubscriptionWall from '@/components/subscription/SubscriptionWall'

/**
 * SubscriptionWall jest teraz aktywny
 * Naprawiono: Dodano timeout 10 sekund i poprawiono obsługę błędów
 * aby zapobiec infinite loading na głównej stronie
 */
// Toggle this to disable subscription wall if it causes issues
const ENABLE_SUBSCRIPTION_WALL = true

interface MainLayoutProps {
  children?: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [activeView, setActiveView] = useState<AssistantId>('tasks')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Timeout zabezpieczający - wymusza zakończenie loading po 10 sekundach
    const timeoutId = setTimeout(() => {
      console.error('⏱️ [MainLayout] TIMEOUT - forcing loading to false after 10 seconds')
      setLoading(false)
    }, 10000) // 10 sekund

    // Check authentication
    const checkAuth = async () => {
      console.log('🔍 [MainLayout] checkAuth started')
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('🔍 [MainLayout] User:', user?.id || 'NULL')
        console.log('🔍 [MainLayout] User error:', userError)
        
        if (!user) {
          console.log('⚠️ [MainLayout] No user found, redirecting to login')
          setLoading(false)  // ✅ DODANO: setLoading(false) przed return
          router.push('/login')
          return
        }
        
        console.log('✅ [MainLayout] User found:', user.email)
        setUser(user)

        // Check if user is admin
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        console.log('🔍 [MainLayout] Profile:', profile)
        console.log('🔍 [MainLayout] Profile error:', error)

        if (error) {
          console.error('Error fetching user profile:', error)
          setIsAdmin(false)
        } else {
          setIsAdmin(profile?.is_admin ?? false)
        }
      } catch (error) {
        console.error('❌ [MainLayout] Error in checkAuth:', error)
        setLoading(false)  // ✅ DODANO: setLoading(false) w catch
      } finally {
        console.log('✅ [MainLayout] Setting loading to false')
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 [MainLayout] Auth state change:', event)
        
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ [MainLayout] User signed in:', session.user.email)
          setUser(session.user)

          // Check if user is admin
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single()

          if (profile?.is_admin) {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
          }

          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          console.log('⚠️ [MainLayout] User signed out')
          setUser(null)
          setIsAdmin(false)
          router.push('/login')
        }
      }
    )

    // Odczytaj zapisaną preferencję widoku, jeśli istnieje
    try {
      const stored = localStorage.getItem('active_assistant') as AssistantId | null
      if (stored && ['tasks', 'planning', 'journal', 'decisions', 'support', 'admin'].includes(stored)) {
        setActiveView(stored)
      }
    } catch {}

    // Wyczyść timeout jeśli checkAuth się zakończył
    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [router])
  
  const renderAssistant = () => {
    switch (activeView) {
      case 'tasks':
        return <TasksAssistant />
      
      case 'journal':
        return <JournalAssistantWrapper />
      
      case 'decisions':
        return <DecisionAssistant />
      
      case 'admin':
        if (!isAdmin) {
          return (
            <div className="glass p-8 rounded-2xl text-center">
              <h2 className="text-2xl font-bold mb-4 text-red-500">Brak dostępu</h2>
              <p className="text-muted-foreground">
                Nie masz uprawnień do panelu administratora
              </p>
            </div>
          )
        }
        // Redirect to admin page
        router.push('/admin')
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Przekierowywanie do panelu admina...</p>
          </div>
        )
      
      case 'planning':
      case 'support':
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">
              {activeView === 'planning' && 'Asystent Planowania'}
              {activeView === 'support' && 'Wsparcie'}
            </h2>
            <p className="text-muted-foreground">
              Ten asystent będzie dodany w kolejnych etapach
            </p>
          </div>
        )
      
      default:
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <p className="text-muted-foreground">Wybierz asystenta z menu</p>
          </div>
        )
    }
  }
  
  const handleNavigate = (view: AssistantId) => {
    setActiveView(view)
    try { localStorage.setItem('active_assistant', view) } catch {}
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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
    <>
      {ENABLE_SUBSCRIPTION_WALL ? (
        <SubscriptionWall>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-x-hidden">
            <Header 
              user={user ? { email: user.email, name: user.user_metadata?.full_name } : null}
              onSignOut={handleSignOut}
            />
            <div className="flex">
              <Sidebar activeView={activeView} onNavigate={handleNavigate} isAdmin={isAdmin} />
              <main className="flex-1 p-6 overflow-x-hidden">
                {children || renderAssistant()}
              </main>
            </div>
          </div>
        </SubscriptionWall>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-x-hidden">
          <Header 
            user={user ? { email: user.email, name: user.user_metadata?.full_name } : null}
            onSignOut={handleSignOut}
          />
          <div className="flex">
            <Sidebar activeView={activeView} onNavigate={handleNavigate} isAdmin={isAdmin} />
            <main className="flex-1 p-6 overflow-x-hidden">
              {children || renderAssistant()}
            </main>
          </div>
        </div>
      )}
    </>
  )
}
