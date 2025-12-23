'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Clock } from '@phosphor-icons/react'

export default function TrialBanner() {
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkTrial = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_status, trial_end_date, trial_used, is_admin')
        .eq('id', user.id)
        .single()

      if (!profile || profile.is_admin) return
      if (profile.subscription_status === 'active') return

      if (!profile.trial_used && profile.trial_end_date) {
        const now = new Date()
        const trialEnd = new Date(profile.trial_end_date)
        if (now < trialEnd) {
          const days = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          setTrialDaysRemaining(days)
        }
      }
    }

    checkTrial()
  }, [])

  if (trialDaysRemaining === null) return null

  return (
    <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock size={24} className="text-brand-purple" weight="duotone" />
          <p className="text-sm font-medium">
            {trialDaysRemaining === 1 
              ? 'Ostatni dzień okresu próbnego!' 
              : `Pozostało ${trialDaysRemaining} dni okresu próbnego`}
          </p>
        </div>
        <Button
          onClick={() => router.push('/subscription')}
          size="sm"
          className="bg-gradient-to-r from-brand-purple to-brand-pink"
        >
          Aktywuj Pro
        </Button>
      </div>
    </div>
  )
}
