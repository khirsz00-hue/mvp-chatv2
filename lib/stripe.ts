import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Price IDs from environment
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
}

// Helper to get or create a Stripe customer
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const { supabase } = await import('./supabaseClient')
  
  // Check if customer already exists
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      supabase_user_id: userId,
    },
  })

  // Save customer ID to database
  await supabase
    .from('user_profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

// Helper to check if user has active subscription
export function hasActiveSubscription(
  subscriptionStatus: string | null | undefined
): boolean {
  return ['active', 'trialing'].includes(subscriptionStatus || '')
}

// Helper to get subscription tier display name
export function getSubscriptionTierName(tier: string | null | undefined): string {
  switch (tier) {
    case 'pro':
      return 'Pro'
    case 'enterprise':
      return 'Enterprise'
    case 'free':
    default:
      return 'Free'
  }
}
