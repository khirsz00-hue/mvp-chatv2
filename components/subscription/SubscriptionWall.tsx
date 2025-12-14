'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { CreditCard, Sparkle, Check } from '@phosphor-icons/react'

interface SubscriptionWallProps {
  children: ReactNode
}

// Supabase error code for "no rows returned"
const SUPABASE_NO_ROWS_CODE = 'PGRST116'

export default function SubscriptionWall({ children }: SubscriptionWallProps) {
  const [loading, setLoading] = useState(true)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    console.log('🔍 [SubscriptionWall] Starting subscription check...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔍 [SubscriptionWall] User ID:', user?.id)
      
      if (!user) {
        console.log('⚠️ [SubscriptionWall] No user found, redirecting to login')
        router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('subscription_status, subscription_tier, is_admin')
        .eq('id', user.id)
        .single()

      console.log('🔍 [SubscriptionWall] Profile data:', profile)
      console.log('🔍 [SubscriptionWall] Profile error:', error)

      // Handle missing profile
      if (error && error.code === SUPABASE_NO_ROWS_CODE) {
        console.log('⚠️ [SubscriptionWall] Profile not found, creating...')
        const userEmail = user.email || 'unknown@example.com'
        const created = await createMissingProfile(user.id, userEmail)
        if (created) {
          console.log('✅ [SubscriptionWall] Profile created successfully')
        } else {
          console.error('❌ [SubscriptionWall] Failed to create profile')
        }
        setHasActiveSubscription(false)
        setLoading(false)
        return
      }

      // Handle other errors
      if (error) {
        console.error('❌ [SubscriptionWall] Error fetching profile:', error)
        setHasActiveSubscription(false)
        setLoading(false)
        return
      }

      // Admin always has access
      if (profile?.is_admin) {
        console.log('✅ [SubscriptionWall] User is admin, granting access')
        setHasActiveSubscription(true)
        setLoading(false)
        return
      }

      // Check for active subscription statuses
      const activeStatuses = ['active', 'trialing']
      const hasAccess = activeStatuses.includes(profile?.subscription_status || '')
      console.log('🔍 [SubscriptionWall] Subscription status:', profile?.subscription_status, '| Has access:', hasAccess)
      setHasActiveSubscription(hasAccess)
    } catch (error) {
      console.error('❌ [SubscriptionWall] Unexpected error:', error)
      setHasActiveSubscription(false)
    } finally {
      console.log('✅ [SubscriptionWall] Setting loading to false')
      setLoading(false)
    }
  }

  const createMissingProfile = async (userId: string, email: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          subscription_status: 'inactive',
          subscription_tier: 'free',
          is_admin: false
        })

      if (error) {
        console.error('Error creating profile:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error creating missing profile:', error)
      return false
    }
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
          <p className="text-muted-foreground">Sprawdzanie subskrypcji...</p>
        </div>
      </div>
    )
  }

  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-purple-100 rounded-full">
                <CreditCard size={48} className="text-brand-purple" weight="duotone" />
              </div>
            </div>
            <CardTitle className="text-3xl mb-2">
              🚀 Odblokuj pełny dostęp
            </CardTitle>
            <CardDescription className="text-base">
              Aby korzystać z AI Assistants PRO potrzebujesz aktywnej subskrypcji
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Check size={24} className="text-green-600 mt-0.5 flex-shrink-0" weight="bold" />
                <div>
                  <p className="font-medium">Nielimitowane rozmowy z AI</p>
                  <p className="text-sm text-muted-foreground">Bez limitów wiadomości i tokenów</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={24} className="text-green-600 mt-0.5 flex-shrink-0" weight="bold" />
                <div>
                  <p className="font-medium">Wszystkie asystenty AI</p>
                  <p className="text-sm text-muted-foreground">Zadania, dziennik, decyzje i więcej</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={24} className="text-green-600 mt-0.5 flex-shrink-0" weight="bold" />
                <div>
                  <p className="font-medium">Zaawansowane analizy AI</p>
                  <p className="text-sm text-muted-foreground">Inteligentne podsumowania i insights</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={24} className="text-green-600 mt-0.5 flex-shrink-0" weight="bold" />
                <div>
                  <p className="font-medium">Integracje z narzędziami</p>
                  <p className="text-sm text-muted-foreground">Todoist, Calendar i więcej</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={24} className="text-green-600 mt-0.5 flex-shrink-0" weight="bold" />
                <div>
                  <p className="font-medium">Priorytetowe wsparcie</p>
                  <p className="text-sm text-muted-foreground">Szybka pomoc techniczna</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={24} className="text-green-600 mt-0.5 flex-shrink-0" weight="bold" />
                <div>
                  <p className="font-medium">Nowe funkcje jako pierwszy</p>
                  <p className="text-sm text-muted-foreground">Early access do nowości</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => router.push('/subscription')}
                className="w-full bg-gradient-to-r from-brand-purple to-brand-pink"
                size="lg"
              >
                <Sparkle size={20} className="mr-2" weight="fill" />
                Wybierz plan subskrypcji
              </Button>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full"
              >
                Wyloguj się
              </Button>
            </div>

            <div className="text-center pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                💰 Pierwsze 7 dni za darmo • 🔒 Bezpieczne płatności Stripe
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
