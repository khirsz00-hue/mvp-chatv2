'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft, Trash, Archive, Database, Warning } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { isMissingTableError, isNetworkError } from '@/lib/supabaseHelper'
import { SupabaseSetupGuide } from './SupabaseSetupGuide'

interface ArchivedEntry {
  id: string
  entry_id: string
  user_id: string
  content: string
  archived_at: string
}

interface JournalArchiveProps {
  userId: string
  onBack: () => void
}

export function JournalArchive({ userId, onBack }: JournalArchiveProps) {
  const { showToast } = useToast()
  const [archivedEntries, setArchivedEntries] = useState<ArchivedEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [errorType, setErrorType] = useState<'none' | 'missing-tables' | 'network' | 'other'>('none')
  const [retryCount, setRetryCount] = useState(0)

  // Fetch archived entries
  const fetchArchivedEntries = useCallback(async (isRetry = false) => {
    // Validate userId before making request
    if (!userId || userId.trim() === '') {
      console.error('Invalid userId:', userId)
      setErrorType('other')
      showToast('Błąd: Brak identyfikatora użytkownika', 'error')
      return
    }

    setLoading(true)
    setErrorType('none')
    
    try {
      const { data, error } = await supabase
        .from('journal_archives')
        .select('*')
        .eq('user_id', userId)
        .order('archived_at', { ascending: false })

      if (error) throw error

      setArchivedEntries(data || [])
      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error('Error fetching archived entries:', {
        error: err,
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        userId: userId
      })

      // Check if error is due to missing tables
      if (isMissingTableError(err)) {
        console.error('Missing table detected: journal_archives table does not exist')
        setErrorType('missing-tables')
        showToast('Tabele nie istnieją - wymagana konfiguracja', 'error')
        return
      }

      // Check if it's a network error and retry
      if (isNetworkError(err) && !isRetry && retryCount < 3) {
        console.log(`Network error detected, retrying... (attempt ${retryCount + 1}/3)`)
        setRetryCount(prev => prev + 1)
        setTimeout(() => fetchArchivedEntries(true), 2000)
        showToast('Błąd sieci, próba ponowna...', 'error')
        return
      }

      setErrorType('other')
      
      // More detailed error message for user
      const errorMessage = err.message 
        ? `Nie udało się pobrać archiwum: ${err.message}`
        : 'Nie udało się pobrać archiwum'
      
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }, [userId, showToast, retryCount])

  useEffect(() => {
    fetchArchivedEntries()
  }, [fetchArchivedEntries])

  // Delete archived entry permanently
  const handleDeleteArchived = async (archiveId: string, entryId: string) => {
    const confirmed = confirm('Czy na pewno chcesz trwale usunąć ten wpis z archiwum?')
    if (!confirmed) return

    try {
      // Delete from archive
      const { error: archiveError } = await supabase
        .from('journal_archives')
        .delete()
        .eq('id', archiveId)

      if (archiveError) {
        console.error('Error deleting from archive:', {
          error: archiveError,
          archiveId,
          message: archiveError.message
        })
        throw archiveError
      }

      // Delete the original entry (if it still exists)
      // Note: This may fail if the entry was already deleted, which is acceptable
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)

      setArchivedEntries(prev => prev.filter(e => e.id !== archiveId))
      showToast('Wpis usunięty z archiwum', 'success')
    } catch (err: any) {
      console.error('Error deleting archived entry:', {
        error: err,
        message: err.message,
        code: err.code
      })
      
      const errorMessage = err.message
        ? `Nie udało się usunąć wpisu: ${err.message}`
        : 'Nie udało się usunąć wpisu'
      
      showToast(errorMessage, 'error')
    }
  }

  // Show setup guide if tables are missing
  if (showSetupGuide) {
    return <SupabaseSetupGuide onClose={() => {
      setShowSetupGuide(false)
      setErrorType('none')
      onBack()
    }} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onBack}
          variant="ghost"
          className="gap-2"
        >
          <ArrowLeft size={20} weight="bold" />
          Wróć
        </Button>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Archiwum Dziennika
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Zarchiwizowane wpisy</p>
        </div>
      </div>

      {/* Error State - Missing Tables */}
      {errorType === 'missing-tables' && (
        <Card className="border-orange-200 bg-orange-50">
          <div className="p-6">
            <div className="flex gap-3 items-start">
              <Warning size={24} weight="bold" className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">
                  Brak tabel w bazie danych
                </h3>
                <p className="text-orange-800 text-sm mb-3">
                  Tabele Dziennika nie zostały jeszcze utworzone w Supabase. 
                  Kliknij poniższy przycisk, aby zobaczyć instrukcję konfiguracji.
                </p>
                <Button
                  onClick={() => setShowSetupGuide(true)}
                  className="gap-2"
                  size="sm"
                >
                  <Database size={18} weight="bold" />
                  Konfiguracja bazy danych
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error State - Network/Other */}
      {errorType === 'network' && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-6">
            <div className="flex gap-3 items-start">
              <Warning size={24} weight="bold" className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Błąd połączenia
                </h3>
                <p className="text-red-800 text-sm mb-3">
                  Nie udało się połączyć z bazą danych. Sprawdź swoje połączenie internetowe.
                </p>
                <Button
                  onClick={() => fetchArchivedEntries()}
                  variant="outline"
                  size="sm"
                >
                  Spróbuj ponownie
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Archived Entries List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Ładowanie archiwum...</span>
            </div>
          </Card>
        ) : archivedEntries.length === 0 && errorType === 'none' ? (
          <Card className="p-12 text-center">
            <Archive size={64} className="mx-auto mb-4 text-gray-300" weight="light" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Archiwum puste</h3>
            <p className="text-gray-500">Nie masz jeszcze żadnych zarchiwizowanych wpisów</p>
          </Card>
        ) : (
          archivedEntries.map(entry => (
            <Card key={entry.id} className="p-6 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm text-gray-500">
                  <div>
                    Zarchiwizowano: {format(parseISO(entry.archived_at), 'EEEE, d MMMM yyyy, HH:mm', { locale: pl })}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteArchived(entry.id, entry.entry_id)}
                  className="gap-1 text-red-600 hover:bg-red-50"
                >
                  <Trash size={16} weight="bold" />
                  Usuń
                </Button>
              </div>
              
              <div className="whitespace-pre-wrap text-gray-700">
                {entry.content}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
