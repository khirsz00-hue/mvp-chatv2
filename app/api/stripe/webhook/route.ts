import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabaseClient'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    
    // Log error to database
    await supabase.from('webhook_errors').insert({
      event_type: 'signature_verification_failed',
      error_message: err.message,
      event_data: { body: body.substring(0, 500) }
    })
    
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event with try-catch for each handler
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error handling webhook:', error)
    
    // Log error to database
    await supabase.from('webhook_errors').insert({
      event_type: event.type,
      error_message: error.message,
      event_data: event.data.object
    })
    
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  if (!userId) return

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  await supabase
    .from('user_profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      subscription_tier: 'pro',
      subscription_start_date: new Date().toISOString(),
    })
    .eq('id', userId)

  // Log to subscription history
  await supabase.from('subscription_history').insert({
    user_id: userId,
    event_type: 'created',
    subscription_status: 'active',
    subscription_tier: 'pro',
    stripe_event_id: session.id,
  })
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user by customer ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  const status = subscription.status
  const subscriptionData = subscription as any
  const currentPeriodEnd = subscriptionData.current_period_end 
    ? new Date(subscriptionData.current_period_end * 1000).toISOString()
    : null

  const updateData: any = {
    stripe_subscription_id: subscription.id,
    subscription_status: status,
  }

  if (currentPeriodEnd) {
    updateData.subscription_end_date = currentPeriodEnd
  }

  await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', profile.id)

  // Log to subscription history
  await supabase.from('subscription_history').insert({
    user_id: profile.id,
    event_type: 'updated',
    subscription_status: status,
    stripe_event_id: subscription.id,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  // Downgrade to free but keep data
  await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'canceled',
      subscription_tier: 'free',
      subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      // Keep stripe_customer_id for potential resubscription
    })
    .eq('id', profile.id)

  // Log to subscription history
  await supabase.from('subscription_history').insert({
    user_id: profile.id,
    event_type: 'canceled',
    subscription_status: 'canceled',
    stripe_event_id: subscription.id,
  })
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  // Update subscription status to active if payment succeeded
  await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'active',
    })
    .eq('id', profile.id)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  // Update subscription status to past_due
  await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id)
}
