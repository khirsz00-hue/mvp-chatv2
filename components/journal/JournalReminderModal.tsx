/**
 * JournalReminderModal Component
 * 
 * A friendly reminder modal that appears once per day to encourage users to fill their journal.
 * Unlike journalRequired (which blocks navigation), this is a dismissible reminder.
 * 
 * Features:
 * - Shows once per day on first app load
 * - Two action buttons: navigate to journal or dismiss
 * - Tracks display in localStorage with date
 * - Non-blocking - user can dismiss and continue
 */

'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { Book } from '@phosphor-icons/react'

interface JournalReminderModalProps {
  open: boolean
  onClose: () => void
  onGoToJournal: () => void
}

export function JournalReminderModal({ open, onClose, onGoToJournal }: JournalReminderModalProps) {
  const handleGoToJournal = () => {
    onGoToJournal()
    onClose()
  }

  const handleClose = () => {
    // Mark as shown for today
    try {
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem(`journal_reminder_shown_${today}`, 'true')
    } catch (error) {
      console.error('Error saving journal reminder state:', error)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-purple/10 to-brand-pink/10 flex items-center justify-center">
              <Book size={24} weight="bold" className="text-brand-purple" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              Uzupełnij dziennik
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600">
            Pamiętaj o uzupełnieniu dzisiejszego wpisu w dzienniku. Regularne zapisywanie pomoże Ci lepiej zrozumieć swoje wzorce i postępy.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 mt-4">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
          >
            Zamknij
          </Button>
          <Button
            onClick={handleGoToJournal}
            className="flex-1 gap-2"
          >
            <Book size={20} weight="bold" />
            Przejdź do dziennika
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
