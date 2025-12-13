import { useState, useEffect, useCallback } from 'react'
import { JournalEntry } from '@/types/journal'
import {
  getJournalEntryByDate,
  upsertJournalEntry,
  deleteJournalEntry,
  getAllJournalEntries,
} from '@/lib/journal'

export function useJournalEntries(userId: string | null) {
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null)
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch journal entry for a specific date
   */
  const fetchEntryByDate = useCallback(
    async (date: string) => {
      if (!userId) return

      setLoading(true)
      setError(null)

      try {
        const entry = await getJournalEntryByDate(userId, date)
        setCurrentEntry(entry)
      } catch (err: any) {
        console.error('Error fetching entry:', err)
        setError(err.message || 'Failed to fetch entry')
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  /**
   * Fetch all journal entries
   */
  const fetchAllEntries = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const entries = await getAllJournalEntries(userId)
      setAllEntries(entries)
    } catch (err: any) {
      console.error('Error fetching entries:', err)
      setError(err.message || 'Failed to fetch entries')
    } finally {
      setLoading(false)
    }
  }, [userId])

  /**
   * Save or update journal entry
   */
  const saveEntry = useCallback(
    async (entry: Partial<JournalEntry>) => {
      if (!userId) return

      setLoading(true)
      setError(null)

      try {
        const savedEntry = await upsertJournalEntry(userId, entry)
        setCurrentEntry(savedEntry)

        // Update allEntries if it's already loaded
        if (allEntries.length > 0) {
          setAllEntries((prev) => {
            const index = prev.findIndex((e) => e.id === savedEntry.id)
            if (index >= 0) {
              // Update existing entry
              const updated = [...prev]
              updated[index] = savedEntry
              return updated
            } else {
              // Add new entry
              return [savedEntry, ...prev]
            }
          })
        }

        return savedEntry
      } catch (err: any) {
        console.error('Error saving entry:', err)
        setError(err.message || 'Failed to save entry')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId, allEntries.length]
  )

  /**
   * Delete journal entry
   */
  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!userId) return

      setLoading(true)
      setError(null)

      try {
        await deleteJournalEntry(userId, entryId)

        // Update state
        if (currentEntry?.id === entryId) {
          setCurrentEntry(null)
        }

        setAllEntries((prev) => prev.filter((e) => e.id !== entryId))
      } catch (err: any) {
        console.error('Error deleting entry:', err)
        setError(err.message || 'Failed to delete entry')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId, currentEntry]
  )

  /**
   * Clear current entry
   */
  const clearCurrentEntry = useCallback(() => {
    setCurrentEntry(null)
  }, [])

  return {
    currentEntry,
    allEntries,
    loading,
    error,
    fetchEntryByDate,
    fetchAllEntries,
    saveEntry,
    removeEntry,
    clearCurrentEntry,
  }
}
