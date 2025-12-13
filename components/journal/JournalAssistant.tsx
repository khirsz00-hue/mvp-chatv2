'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Textarea from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { Plus, Archive, Trash, PencilSimple, FloppyDisk, X, Database, Warning, CheckCircle } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { JournalArchive } from './JournalArchive'
import { SupabaseSetupGuide } from './SupabaseSetupGuide'
import { isMissingTableError, isNetworkError, getSupabaseStatus, SupabaseStatus } from '@/lib/supabaseHelper'

interface JournalEntry {
  id: string
  user_id: string
  content: string
  archived: boolean
  created_at: string
}

export function JournalAssistant() {
  const { showToast } = useToast()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [newEntryContent, setNewEntryContent] = useState('')
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'none' | 'missing-tables' | 'network' | 'other'>('none')
  const [connectionStatus, setConnectionStatus] = useState<SupabaseStatus>(SupabaseStatus.OK)
  const [retryCount, setRetryCount] = useState(0)

  // Get user ID from Supabase auth and check connection status
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      
      // Check Supabase status
      const status = await getSupabaseStatus()
      setConnectionStatus(status.status)
      
      if (status.status === SupabaseStatus.MISSING_TABLES) {
        console.warn('Missing tables detected:', status.details)
      }
    }
    getUser()
  }, [])

  // Fetch journal entries
  const fetchEntries = useCallback(async (isRetry = false) => {
    // Validate userId before making request
    if (!userId || userId.trim() === '') {
      console.error('Invalid userId:', userId)
      return
    }
    
    setLoading(true)
    setErrorType('none')
    
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      setEntries(data || [])
      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error('Error fetching entries:', {
        error: err,
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        userId: userId
      })

      // Check if error is due to missing tables
      if (isMissingTableError(err)) {
        console.error('Missing table detected: journal_entries table does not exist')
        setErrorType('missing-tables')
        setConnectionStatus(SupabaseStatus.MISSING_TABLES)
        showToast('Tabele nie istnieją - wymagana konfiguracja', 'error')
        return
      }

      // Check if it's a network error and retry
      if (isNetworkError(err) && !isRetry && retryCount < 3) {
        console.log(`Network error detected, retrying... (attempt ${retryCount + 1}/3)`)
        setRetryCount(prev => prev + 1)
        setTimeout(() => fetchEntries(true), 2000)
        setErrorType('network')
        showToast('Błąd sieci, próba ponowna...', 'error')
        return
      }

      setErrorType('other')
      
      // More detailed error message for user
      const errorMessage = err.message 
        ? `Nie udało się pobrać wpisów: ${err.message}`
        : 'Nie udało się pobrać wpisów'
      
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }, [userId, showToast, retryCount])

  useEffect(() => {
    if (userId) {
      fetchEntries()
    }
  }, [userId, fetchEntries])

  // Create new entry
  const handleCreateEntry = async () => {
    if (!newEntryContent.trim() || !userId) return

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert([
          {
            user_id: userId,
            content: newEntryContent.trim(),
            archived: false
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating entry:', {
          error,
          message: error.message,
          code: error.code
        })
        
        if (isMissingTableError(error)) {
          setErrorType('missing-tables')
          showToast('Tabele nie istnieją - wymagana konfiguracja', 'error')
          return
        }
        
        throw error
      }

      setEntries(prev => [data, ...prev])
      setNewEntryContent('')
      showToast('Wpis utworzony', 'success')
    } catch (err: any) {
      console.error('Error creating entry:', err)
      
      const errorMessage = err.message
        ? `Nie udało się utworzyć wpisu: ${err.message}`
        : 'Nie udało się utworzyć wpisu'
      
      showToast(errorMessage, 'error')
    }
  }

  // Update entry
  const handleUpdateEntry = async (entryId: string, newContent: string) => {
    if (!newContent.trim()) return

    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ content: newContent.trim() })
        .eq('id', entryId)

      if (error) throw error

      setEntries(prev => prev.map(entry =>
        entry.id === entryId ? { ...entry, content: newContent.trim() } : entry
      ))
      setEditingEntryId(null)
      setEditingContent('')
      showToast('Wpis zaktualizowany', 'success')
    } catch (err: any) {
      console.error('Error updating entry:', err)
      showToast('Nie udało się zaktualizować wpisu', 'error')
    }
  }

  // Archive entry
  const handleArchiveEntry = async (entry: JournalEntry) => {
    try {
      // Create archive record
      const { error: archiveError } = await supabase
        .from('journal_archives')
        .insert([
          {
            entry_id: entry.id,
            user_id: entry.user_id,
            content: entry.content
          }
        ])

      if (archiveError) throw archiveError

      // Mark entry as archived
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({ archived: true })
        .eq('id', entry.id)

      if (updateError) throw updateError

      setEntries(prev => prev.filter(e => e.id !== entry.id))
      showToast('Wpis zarchiwizowany', 'success')
    } catch (err: any) {
      console.error('Error archiving entry:', err)
      showToast('Nie udało się zarchiwizować wpisu', 'error')
    }
  }

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    const confirmed = confirm('Czy na pewno chcesz usunąć ten wpis?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error

      setEntries(prev => prev.filter(e => e.id !== entryId))
      showToast('Wpis usunięty', 'success')
    } catch (err: any) {
      console.error('Error deleting entry:', err)
      showToast('Nie udało się usunąć wpisu', 'error')
    }
  }

  // Start editing
  const startEditing = (entry: JournalEntry) => {
    setEditingEntryId(entry.id)
    setEditingContent(entry.content)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingEntryId(null)
    setEditingContent('')
  }

  // No user logged in
  if (!userId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dziennik Refleksji</h1>
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-purple/10 to-brand-pink/10 flex items-center justify-center mb-4">
            📔
          </div>
          <h2 className="text-xl font-semibold">Zaloguj się</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Aby korzystać z dziennika, musisz być zalogowany
          </p>
        </Card>
      </div>
    )
  }

  // Show setup guide if requested or if tables are missing
  if (showSetupGuide) {
    return (
      <SupabaseSetupGuide 
        onClose={() => {
          setShowSetupGuide(false)
          // Refresh status after setup
          getSupabaseStatus().then(status => {
            setConnectionStatus(status.status)
            if (status.status === SupabaseStatus.OK) {
              fetchEntries()
            }
          })
        }} 
      />
    )
  }

  // Show archive view
  if (showArchive) {
    return (
      <JournalArchive
        userId={userId}
        onBack={() => setShowArchive(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Dziennik Refleksji
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Zapisuj swoje myśli i refleksje</p>
          
          {/* Connection status indicator */}
          {connectionStatus !== SupabaseStatus.OK && (
            <div className="flex items-center gap-2 mt-2">
              {connectionStatus === SupabaseStatus.MISSING_TABLES ? (
                <>
                  <Warning size={16} weight="bold" className="text-orange-600" />
                  <span className="text-sm text-orange-600">Wymagana konfiguracja bazy danych</span>
                </>
              ) : connectionStatus === SupabaseStatus.NOT_CONFIGURED ? (
                <>
                  <Warning size={16} weight="bold" className="text-red-600" />
                  <span className="text-sm text-red-600">Supabase nie jest skonfigurowany</span>
                </>
              ) : (
                <>
                  <Warning size={16} weight="bold" className="text-yellow-600" />
                  <span className="text-sm text-yellow-600">Błąd połączenia</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowArchive(true)}
            variant="outline"
            className="gap-2"
          >
            <Archive size={20} weight="bold" />
            Archiwum
          </Button>
          
          {connectionStatus === SupabaseStatus.MISSING_TABLES && (
            <Button
              onClick={() => setShowSetupGuide(true)}
              className="gap-2"
            >
              <Database size={20} weight="bold" />
              Konfiguracja
            </Button>
          )}
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

      {/* Error State - Network */}
      {errorType === 'network' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="p-6">
            <div className="flex gap-3 items-start">
              <Warning size={24} weight="bold" className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Problemy z połączeniem
                </h3>
                <p className="text-yellow-800 text-sm mb-3">
                  Nie udało się połączyć z bazą danych. Sprawdź swoje połączenie internetowe i spróbuj ponownie.
                </p>
                <Button
                  onClick={() => fetchEntries()}
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

      {/* New Entry Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Nowy wpis</h2>
        <Textarea
          value={newEntryContent}
          onChange={(e) => setNewEntryContent(e.target.value)}
          placeholder="Napisz swoje myśli..."
          rows={6}
          className="mb-4"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleCreateEntry}
            disabled={!newEntryContent.trim()}
            className="gap-2"
          >
            <Plus size={20} weight="bold" />
            Dodaj wpis
          </Button>
        </div>
      </Card>

      {/* Entries List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Twoje wpisy</h2>
        
        {loading ? (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Ładowanie wpisów...</span>
            </div>
          </Card>
        ) : entries.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📔</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Brak wpisów</h3>
            <p className="text-gray-500">Dodaj swój pierwszy wpis do dziennika</p>
          </Card>
        ) : (
          entries.map(entry => (
            <Card key={entry.id} className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm text-gray-500">
                  {format(parseISO(entry.created_at), 'EEEE, d MMMM yyyy, HH:mm', { locale: pl })}
                </div>
                <div className="flex gap-2">
                  {editingEntryId === entry.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateEntry(entry.id, editingContent)}
                        className="gap-1"
                      >
                        <FloppyDisk size={16} weight="bold" />
                        Zapisz
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                        className="gap-1"
                      >
                        <X size={16} weight="bold" />
                        Anuluj
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(entry)}
                        className="gap-1"
                      >
                        <PencilSimple size={16} weight="bold" />
                        Edytuj
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchiveEntry(entry)}
                        className="gap-1"
                      >
                        <Archive size={16} weight="bold" />
                        Archiwizuj
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="gap-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash size={16} weight="bold" />
                        Usuń
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {editingEntryId === entry.id ? (
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700">
                  {entry.content}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
