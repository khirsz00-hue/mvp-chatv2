import { supabase } from './supabaseClient'
import { LIMITS, ResourceType as RT, SubscriptionTier } from './subscriptionLimits'

export type ResourceType = RT

export async function checkUsageLimit(
  userId: string,
  resource: RT
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Get user tier
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, is_admin, trial_end_date, trial_used')
    .eq('id', userId)
    .single()

  // Admins always have unlimited access
  if (profile?.is_admin) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  // Check if user has active subscription or valid trial
  const hasActiveAccess = await hasAccess(userId)
  if (hasActiveAccess) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  const tier = (profile?.subscription_tier || 'free') as SubscriptionTier
  
  // Get current period
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Get current usage
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('count')
    .eq('user_id', userId)
    .eq('resource_type', resource)
    .gte('period_start', periodStart.toISOString().split('T')[0])
    .lte('period_end', periodEnd.toISOString().split('T')[0])
    .single()

  const current = usage?.count || 0
  const limit = LIMITS[tier][`${resource}_per_month` as keyof typeof LIMITS[typeof tier]]

  return {
    allowed: current < limit,
    current,
    limit: limit === Infinity ? Infinity : Number(limit)
  }
}

export async function incrementUsage(
  userId: string,
  resource: RT
): Promise<void> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('id, count')
    .eq('user_id', userId)
    .eq('resource_type', resource)
    .gte('period_start', periodStart.toISOString().split('T')[0])
    .lte('period_end', periodEnd.toISOString().split('T')[0])
    .single()

  if (existing) {
    await supabase
      .from('usage_tracking')
      .update({ 
        count: existing.count + 1,
        updated_at: now.toISOString()
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        resource_type: resource,
        count: 1,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0]
      })
  }
}

export async function hasAccess(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_status, is_admin, trial_end_date, trial_used')
    .eq('id', userId)
    .single()

  if (!profile) return false

  // Admins always have access
  if (profile.is_admin) return true

  // Check active subscription
  if (['active', 'trialing'].includes(profile.subscription_status || '')) return true

  // Check trial period
  if (!profile.trial_used && profile.trial_end_date) {
    const now = new Date()
    const trialEnd = new Date(profile.trial_end_date)
    if (now < trialEnd) return true
  }

  return false
}
