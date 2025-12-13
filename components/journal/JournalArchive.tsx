'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft, Trash, Archive } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

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

  // Fetch archived entries
  const fetchArchivedEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('journal_archives')
        .select('*')
        .eq('user_id', userId)
        .order('archived_at', { ascending: false })

      if (error) throw error

      setArchivedEntries(data || [])
    } catch (err: any) {
      console.error('Error fetching archived entries:', err)
      showToast('Nie udało się pobrać archiwum', 'error')
    } finally {
      setLoading(false)
    }
  }, [userId, showToast])

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

      if (archiveError) throw archiveError

      // Delete the original entry (if it still exists)
      const { error: entryError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)

      // Ignore error if entry doesn't exist
      if (entryError && !entryError.message.includes('no rows')) {
        console.warn('Could not delete original entry:', entryError)
      }

      setArchivedEntries(prev => prev.filter(e => e.id !== archiveId))
      showToast('Wpis usunięty z archiwum', 'success')
    } catch (err: any) {
      console.error('Error deleting archived entry:', err)
      showToast('Nie udało się usunąć wpisu', 'error')
    }
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

      {/* Archived Entries List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Ładowanie archiwum...</span>
            </div>
          </Card>
        ) : archivedEntries.length === 0 ? (
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
