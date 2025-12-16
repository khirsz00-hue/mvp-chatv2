/**
 * Integration status helpers
 * Single source of truth for checking integration connection status
 */

import { supabase } from './supabaseClient'

/**
 * Check if user has Todoist connected
 * @param userId - User ID to check
 * @returns Promise<boolean> - True if Todoist token exists in DB
 */
export async function isTodoistConnected(userId: string): Promise<boolean> {
  if (!userId) {
    console.warn('[Integrations] Cannot check Todoist status - no user ID')
    return false
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Integrations] Error checking Todoist status:', error.message)
      return false
    }

    const isConnected = !!data?.todoist_token
    console.log(`[Integrations] Todoist connected for user ${userId.substring(0, 8)}...: ${isConnected ? 'YES' : 'NO'}`)

    return isConnected
  } catch (error) {
    console.error('[Integrations] Error checking Todoist status:', error)
    return false
  }
}

/**
 * Check if user has Google Calendar connected
 * @param userId - User ID to check
 * @returns Promise<boolean> - True if Google token exists in DB
 */
export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  if (!userId) {
    console.warn('[Integrations] Cannot check Google Calendar status - no user ID')
    return false
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('google_access_token, google_token_expiry')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Integrations] Error checking Google Calendar status:', error.message)
      return false
    }

    // Check if token exists and is not expired
    const hasToken = !!data?.google_access_token
    const isExpired = data?.google_token_expiry ? data.google_token_expiry < Date.now() : false
    const isConnected = hasToken && !isExpired

    console.log(`[Integrations] Google Calendar connected for user ${userId.substring(0, 8)}...: ${isConnected ? 'YES' : 'NO'}${isExpired ? ' (expired)' : ''}`)

    return isConnected
  } catch (error) {
    console.error('[Integrations] Error checking Google Calendar status:', error)
    return false
  }
}

/**
 * Get Todoist token from database
 * @param userId - User ID
 * @returns Promise<string | null> - Todoist token or null
 */
export async function getTodoistToken(userId: string): Promise<string | null> {
  if (!userId) {
    console.warn('[Integrations] Cannot get Todoist token - no user ID')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Integrations] Error getting Todoist token:', error.message)
      return null
    }

    const token = data?.todoist_token || null
    console.log(`[Integrations] Todoist token for user ${userId.substring(0, 8)}...: ${token ? 'FOUND' : 'MISSING'}`)

    return token
  } catch (error) {
    console.error('[Integrations] Error getting Todoist token:', error)
    return null
  }
}
