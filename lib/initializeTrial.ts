import { supabase } from './supabaseClient'

export async function initializeTrialForNewUser(userId: string): Promise<void> {
  const trialDays = 7
  const now = new Date()
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)

  await supabase
    .from('user_profiles')
    .update({
      trial_start_date: now.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      trial_used: false
    })
    .eq('id', userId)
}
