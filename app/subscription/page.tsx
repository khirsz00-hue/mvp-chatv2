'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { Check, Crown, Sparkle } from '@phosphor-icons/react'
import { useRouter, useSearchParams } from 'next/navigation'

interface UserProfile {
  subscription_status: string
  subscription_tier: string
  subscription_end_date?: string
  stripe_customer_id?: string
}

function SubscriptionContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [processingPortal, setProcessingPortal] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success/cancel params
    if (searchParams?.get('success')) {
      showToast('Subskrypcja aktywowana pomyślnie!', 'success')
      router.replace('/subscription')
    } else if (searchParams?.get('canceled')) {
      showToast('Płatność anulowana', 'error')
      router.replace('/subscription')
    }

    loadProfile()
  }, [searchParams])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('subscription_status, subscription_tier, subscription_end_date, stripe_customer_id')
        .eq('id', user.id)
        .single()

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (priceId: string) => {
    setProcessingCheckout(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout')
      }
    } catch (error: any) {
      showToast(error.message || 'Błąd podczas tworzenia płatności', 'error')
    } finally {
      setProcessingCheckout(false)
    }
  }

  const handleManageSubscription = async () => {
    setProcessingPortal(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create portal session')
      }
    } catch (error: any) {
      showToast(error.message || 'Błąd podczas otwierania panelu', 'error')
    } finally {
      setProcessingPortal(false)
    }
  }

  const hasActiveSubscription = ['active', 'trialing'].includes(profile?.subscription_status || '')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Wybierz swój plan
          </h1>
          <p className="text-muted-foreground text-lg">
            Odblokuj pełną moc AI Assistants PRO
          </p>
        </div>

        {profile && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Twoja subskrypcja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={hasActiveSubscription ? 'success' : 'default'}>
                  {hasActiveSubscription ? 'Aktywna' : 'Nieaktywna'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium capitalize">{profile.subscription_tier}</span>
              </div>
              {profile.subscription_end_date && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Odnawia się:</span>
                  <span className="font-medium">
                    {new Date(profile.subscription_end_date).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              )}
              {hasActiveSubscription && profile.stripe_customer_id && (
                <Button
                  onClick={handleManageSubscription}
                  disabled={processingPortal}
                  variant="outline"
                  className="w-full mt-4"
                >
                  {processingPortal ? 'Ładowanie...' : 'Zarządzaj subskrypcją'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkle size={24} className="text-gray-500" />
                <CardTitle>Free</CardTitle>
              </div>
              <div className="text-3xl font-bold mb-2">0 zł</div>
              <CardDescription>Podstawowe funkcje do wypróbowania</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">Ograniczony dostęp do asystentów</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">10 wiadomości dziennie</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">Podstawowy dziennik</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                disabled={profile?.subscription_tier === 'free'}
              >
                {profile?.subscription_tier === 'free' ? 'Aktualny plan' : 'Darmowy'}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-brand-purple shadow-glow">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="default" className="bg-gradient-to-r from-brand-purple to-brand-pink">
                Polecany
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={24} className="text-brand-purple" />
                <CardTitle>Pro</CardTitle>
              </div>
              <div className="text-3xl font-bold mb-2">
                49 zł <span className="text-base font-normal text-muted-foreground">/miesiąc</span>
              </div>
              <CardDescription>Pełen dostęp do wszystkich funkcji</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">Nieograniczony dostęp do wszystkich asystentów</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">Nielimitowane wiadomości</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">Zaawansowany dziennik z analizami AI</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">Priorytetowe wsparcie</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={20} className="text-green-600 mt-0.5" />
                <span className="text-sm">Integracje z Todoist</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '')}
                disabled={processingCheckout || hasActiveSubscription}
                className="w-full bg-gradient-to-r from-brand-purple to-brand-pink"
              >
                {hasActiveSubscription
                  ? 'Aktywna subskrypcja'
                  : processingCheckout
                  ? 'Przetwarzanie...'
                  : 'Rozpocznij teraz'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  )
}
