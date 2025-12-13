'use client'

import { useState } from 'react'
import { JournalAssistantMain } from './JournalAssistantMain'
import { JournalArchiveView } from './JournalArchiveView'

/**
 * Wrapper component that handles switching between main journal view and archive view
 */
export function JournalAssistantWrapper() {
  const [showArchive, setShowArchive] = useState(false)

  if (showArchive) {
    return <JournalArchiveView onBack={() => setShowArchive(false)} />
  }

  return <JournalAssistantMain onShowArchive={() => setShowArchive(true)} />
}
