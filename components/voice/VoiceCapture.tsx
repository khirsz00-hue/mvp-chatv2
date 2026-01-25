'use client'

import { useState, useEffect } from 'react'
import { Microphone } from '@phosphor-icons/react'
import { VoiceRambleModal } from './VoiceRambleModal'

interface VoiceCaptureProps {
  className?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VoiceCapture({ className, isOpen: externalIsOpen, onOpenChange }: VoiceCaptureProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handle external isOpen prop
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsModalOpen(externalIsOpen)
    }
  }, [externalIsOpen])

  const handleOpenModal = () => {
    setIsModalOpen(true)
    onOpenChange?.(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    onOpenChange?.(false)
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-110 text-white ${className || ''}`}
        title="Dyktuj zadania głosem"
      >
        <Microphone size={28} weight="fill" />
      </button>

      <VoiceRambleModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  )
}
