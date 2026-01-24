'use client'

import Header from './Header'
import Sidebar, { AssistantId, isValidAssistantId } from './Sidebar'
import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { TasksAssistant } from '@/components/assistant/TasksAssistant'
import { JournalAssistantWrapper } from '@/components/journal/JournalAssistantWrapper'
import { DecisionAssistant } from '@/src/features/decision-assistant/components/DecisionAssistant'
import { DayAssistantV2View } from '@/components/day-assistant-v2/DayAssistantV2View'
import { WeekAssistantView } from '@/components/week-assistant/WeekAssistantView'
import SubscriptionWall from '@/components/subscription/SubscriptionWall'
import { VoiceCapture } from '@/components/voice/VoiceCapture'
import TrialBanner from '@/components/subscription/TrialBanner'
import { FloatingAddButton } from '@/components/day-assistant-v2/FloatingAddButton'
import { UniversalTaskModal, TaskData } from '@/components/common/UniversalTaskModal'
import { TaskContext } from '@/lib/services/contextInferenceService'
import { toast } from 'sonner'
import { recalculateDailyTotal } from '@/lib/gamification'
import { FloatingChatButton } from '@/components/chat/FloatingChatButton'
import { ChatAssistant } from '@/components/chat/ChatAssistant'
import { JournalReminderModal } from '@/components/journal/JournalReminderModal'

/**
 * SubscriptionWall jest teraz WŁĄCZONY
 * Dodano pełną funkcjonalność SaaS z limitami użycia, okresami próbnymi i flagami funkcji
 * Admin bypass jest wbudowany w SubscriptionWall
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [journalRequired, setJournalRequired] = useState(false)
  const [showJournalReminder, setShowJournalReminder] = useState(false)
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
          setLoading(false)
          clearTimeout(timeoutId)  // Clear timeout on early return
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
        setLoading(false)
        clearTimeout(timeoutId)  // Clear timeout on error
      } finally {
        console.log('✅ [MainLayout] Setting loading to false')
        setLoading(false)
        clearTimeout(timeoutId)  // Clear timeout on successful completion
      }
    }

    checkAuth()

    // Odczytaj zapisaną preferencję widoku, jeśli istnieje
    // Don't auto-redirect to community - let user stay on main page
    try {
      const stored = localStorage.getItem('active_assistant') as string | null
      // Redirect old 'day-assistant' v1 to v2
      if (stored === 'day-assistant') {
        setActiveView('day-assistant-v2')
        localStorage.setItem('active_assistant', 'day-assistant-v2')
      } else if (stored && stored !== 'community' && isValidAssistantId(stored)) {
        setActiveView(stored)
      } else if (!stored) {
        // Default to tasks if no saved preference
        setActiveView('tasks')
        localStorage.setItem('active_assistant', 'tasks')
      }
    } catch {}

    // Cleanup timeout
    return () => {
      clearTimeout(timeoutId)
    }
  }, [router])
  
  // Global keyboard shortcuts: Shift+Q and Shift+C
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable) {
        return
      }
      
      // Shift+Q to open quick add modal
      if (e.shiftKey && e.key === 'Q') {
        e.preventDefault()
        setShowQuickAdd(true)
      }
      
      // Shift+C to open chat assistant
      if (e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setShowChat(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
    // Block scroll when mobile menu is open
    useEffect(() => {
    // Store original overflow value
    const originalOverflow = document.body.style.overflow
    
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = originalOverflow
    }
    
    // Cleanup - restore original overflow
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isMobileMenuOpen])

  // Friendly journal reminder (non-blocking) - shows once per day
  useEffect(() => {
    const checkJournalReminder = () => {
      try {
        // Don't show if journal guard is disabled
        const disabled = localStorage.getItem('journal_guard_disabled') === 'true'
        if (disabled) {
          return
        }

        const today = new Date().toISOString().split('T')[0]
        const reminderShownKey = `journal_reminder_shown_${today}`
        const completedKey = `journal_completed_${today}`
        
        const reminderShown = localStorage.getItem(reminderShownKey) === 'true'
        const completed = localStorage.getItem(completedKey) === 'true'
        
        // Show reminder if not shown today and journal not completed
        if (!reminderShown && !completed && !loading && user) {
          // Small delay to let the app load first
          setTimeout(() => {
            setShowJournalReminder(true)
          }, 1500)
        }
      } catch (error) {
        console.error('Error checking journal reminder:', error)
      }
    }

    checkJournalReminder()
  }, [loading, user])

  // Wymagaj uruchomienia dziennika na start dnia (z możliwością wyłączenia w ustawieniach)
  useEffect(() => {
    const checkJournalRequirement = () => {
      try {
        const disabled = localStorage.getItem('journal_guard_disabled') === 'true'
        if (disabled) {
          setJournalRequired(false)
          return
        }

        const today = new Date().toISOString().split('T')[0]
        const completedKey = `journal_completed_${today}`
        const completed = localStorage.getItem(completedKey) === 'true'
        setJournalRequired(!completed)

        if (!completed) {
          setActiveView('journal')
          localStorage.setItem('active_assistant', 'journal')
        }
      } catch {
        // ignore storage issues
      }
    }

    checkJournalRequirement()
    const handleJournalSaved = () => checkJournalRequirement()
    window.addEventListener('journal-saved', handleJournalSaved)
    return () => window.removeEventListener('journal-saved', handleJournalSaved)
  }, [])
  
  const handleQuickAdd = async (taskData: TaskData) => {
    try {
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        toast.error('Sesja wygasła - zaloguj się ponownie')
        return
      }
      
      // ✅ VERIFIED API ENDPOINT - now supporting full task data
      const response = await fetch('/api/day-assistant-v2/task', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: taskData.content,
          description: taskData.description,
          estimate_min: taskData.estimated_minutes,
          cognitive_load: taskData.cognitive_load,
          is_must: false,
          is_important: false,
          due_date: taskData.due,
          context_type: 'deep_work', // default
          priority: taskData.priority,
          tags: taskData.labels || [],
          project_id: taskData.project_id,
          labels: taskData.labels
        })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Nie udało się dodać zadania' }))
        toast.error(error.message || 'Błąd podczas dodawania zadania')
        return
      }
      
      const data = await response.json()
      
      // Success!
      toast.success('✅ Zadanie dodane!')
      
      // Close modal
      setShowQuickAdd(false)
      
      // Trigger refresh event for Day Assistant V2
      window.dispatchEvent(new CustomEvent('task-added', { 
        detail: { task: data.task } 
      }))
      
      // 🎮 GAMIFICATION: Recalculate daily stats (reuse user from session)
      await recalculateDailyTotal(session.user.id)
      
    } catch (error) {
      console.error('Quick add error:', error)
      toast.error('Wystąpił błąd podczas dodawania zadania')
    }
  }
  
  const renderAssistant = () => {
    switch (activeView) {
      case 'tasks':
        return <TasksAssistant />
      
      case 'day-assistant-v2':
        return <DayAssistantV2View />
      
      case 'journal':
        return <JournalAssistantWrapper />
      
      case 'decisions':
        return <DecisionAssistant />
      
      case 'community':
        router.push('/community')
        return null
      
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
        // Show admin panel navigation instead of auto-redirect
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Panel Administratora</h2>
            <p className="text-muted-foreground mb-6">
              Zarządzaj ustawieniami i treścią aplikacji
            </p>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              aria-label="Przejdź do panelu administratora"
            >
              Przejdź do panelu administratora
            </button>
          </div>
        )
      
      case 'planning':
        return <WeekAssistantView />
      case 'support':
        return (
          <div className="glass p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Wsparcie</h2>
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
    if (journalRequired && view !== 'journal') {
      toast.error('Zapisz dzisiejszy wpis w dzienniku, aby przejść dalej')
    }
    setActiveView(view)
    setIsMobileMenuOpen(false) // Close mobile menu after navigation
    try { localStorage.setItem('active_assistant', view) } catch {}
  }

  const handleGoToJournal = () => {
    setActiveView('journal')
    setIsMobileMenuOpen(false)
    try { localStorage.setItem('active_assistant', 'journal') } catch {}
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
              onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              isMobileMenuOpen={isMobileMenuOpen}
            />
            <TrialBanner />
            <div className="flex relative">
              {/* Mobile overlay */}
              {isMobileMenuOpen && (
                <div 
                  className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-hidden="true"
                />
              )}
              
              <Sidebar 
                activeView={activeView} 
                onNavigate={handleNavigate} 
                isAdmin={isAdmin}
                isMobileMenuOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
              />
              <main className="flex-1 p-4 sm:p-6">
                {children || renderAssistant()}
              </main>
            </div>
            
            {/* 🎮 GAMIFICATION: Voice Capture Button */}
            {/* Floating Action Buttons - Stacked vertically */}
            <div className="fixed bottom-6 right-6 z-30 lg:z-50 flex flex-col gap-3">
              {/* Add Task Button - Top */}
              <FloatingAddButton onClick={() => setShowQuickAdd(true)} />
              
              {/* Chat Assistant Button - Middle */}
              <FloatingChatButton onClick={() => setShowChat(true)} />
              
              {/* Voice Ramble Button - Bottom */}
              <VoiceCapture />
            </div>
            
            {/* Universal Task Modal for Quick Add (Shift+Q) */}
            <UniversalTaskModal
              open={showQuickAdd}
              onOpenChange={setShowQuickAdd}
              task={null}
              defaultDate={new Date().toISOString().split('T')[0]}
              onSave={handleQuickAdd}
            />
            
            {/* Chat Assistant Modal (Shift+C) */}
            <ChatAssistant
              open={showChat}
              onClose={() => setShowChat(false)}
            />
            
            {/* Journal Reminder Modal - Shows once per day */}
            <JournalReminderModal
              open={showJournalReminder}
              onClose={() => setShowJournalReminder(false)}
              onGoToJournal={handleGoToJournal}
            />
          </div>
        </SubscriptionWall>
      ) : (
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
                className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-hidden="true"
              />
            )}
            
            <Sidebar 
              activeView={activeView} 
              onNavigate={handleNavigate} 
              isAdmin={isAdmin}
              isMobileMenuOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            />
            <main className="flex-1 p-4 sm:p-6">
              {children || renderAssistant()}
            </main>
          </div>
          
          {/* 🎮 GAMIFICATION: Voice Capture Button */}
          {/* Floating Action Buttons - Stacked vertically */}
          <div className="fixed bottom-6 right-6 z-30 lg:z-50 flex flex-col gap-3">
            {/* Add Task Button - Top */}
            <FloatingAddButton onClick={() => setShowQuickAdd(true)} />
            
            {/* Chat Assistant Button - Middle */}
            <FloatingChatButton onClick={() => setShowChat(true)} />
            
            {/* Voice Ramble Button - Bottom */}
            <VoiceCapture />
          </div>
          
          {/* Universal Task Modal for Quick Add (Shift+Q) */}
          <UniversalTaskModal
            open={showQuickAdd}
            onOpenChange={setShowQuickAdd}
            task={null}
            defaultDate={new Date().toISOString().split('T')[0]}
            onSave={handleQuickAdd}
          />
          
          {/* Chat Assistant Modal (Shift+C) */}
          <ChatAssistant
            open={showChat}
            onClose={() => setShowChat(false)}
          />
          
          {/* Journal Reminder Modal - Shows once per day */}
          <JournalReminderModal
            open={showJournalReminder}
            onClose={() => setShowJournalReminder(false)}
            onGoToJournal={handleGoToJournal}
          />
        </div>
      )}
    </>
  )
}
