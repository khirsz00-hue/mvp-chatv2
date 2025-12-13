import { supabase } from './supabaseClient'

export enum SupabaseStatus {
  OK = 'OK',
  MISSING_TABLES = 'MISSING_TABLES',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  NOT_CONFIGURED = 'NOT_CONFIGURED'
}

export interface SupabaseStatusResult {
  status: SupabaseStatus
  message: string
  details?: string
}

/**
 * Check if Supabase connection is working
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Check if credentials are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    if (supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
      return false
    }

    // Try to get the current session
    const { error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error checking Supabase connection:', error)
    return false
  }
}

/**
 * Check if journal tables exist in Supabase
 */
export async function checkTablesExist(): Promise<{
  journalEntries: boolean
  journalArchives: boolean
  allExist: boolean
}> {
  let journalEntries = false
  let journalArchives = false

  try {
    // Try to query journal_entries table
    const { error: entriesError } = await supabase
      .from('journal_entries')
      .select('id')
      .limit(1)

    // Error code 42P01 = relation does not exist (table missing)
    if (!entriesError || entriesError.code !== '42P01') {
      journalEntries = true
    }

    // Try to query journal_archives table
    const { error: archivesError } = await supabase
      .from('journal_archives')
      .select('id')
      .limit(1)

    if (!archivesError || archivesError.code !== '42P01') {
      journalArchives = true
    }
  } catch (error) {
    console.error('Error checking tables:', error)
  }

  return {
    journalEntries,
    journalArchives,
    allExist: journalEntries && journalArchives
  }
}

/**
 * Check if an error is related to missing tables
 */
export function isMissingTableError(error: any): boolean {
  if (!error) return false
  
  // PostgreSQL error code for "relation does not exist"
  if (error.code === '42P01') return true
  
  // Check error message
  const message = error.message?.toLowerCase() || ''
  return message.includes('relation') && message.includes('does not exist')
}

/**
 * Check if an error is a network/connection error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    error.name === 'NetworkError' ||
    error.name === 'TypeError'
  )
}

/**
 * Get overall Supabase status
 */
export async function getSupabaseStatus(): Promise<SupabaseStatusResult> {
  // Check if connection is configured
  const isConnected = await checkSupabaseConnection()
  
  if (!isConnected) {
    return {
      status: SupabaseStatus.NOT_CONFIGURED,
      message: 'Supabase nie jest skonfigurowany',
      details: 'Brak poprawnych kluczy API w zmiennych środowiskowych'
    }
  }

  // Check if tables exist
  const tables = await checkTablesExist()
  
  if (!tables.allExist) {
    const missingTables = []
    if (!tables.journalEntries) missingTables.push('journal_entries')
    if (!tables.journalArchives) missingTables.push('journal_archives')
    
    return {
      status: SupabaseStatus.MISSING_TABLES,
      message: 'Brak wymaganych tabel w bazie danych',
      details: `Brakujące tabele: ${missingTables.join(', ')}`
    }
  }

  return {
    status: SupabaseStatus.OK,
    message: 'Supabase jest poprawnie skonfigurowany',
    details: 'Wszystkie tabele istnieją'
  }
}
