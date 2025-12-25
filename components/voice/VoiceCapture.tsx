'use client'

import { useState } from 'react'
import { Microphone } from '@phosphor-icons/react'
import { VoiceRambleModal } from './VoiceRambleModal'

interface VoiceCaptureProps {
  className?: string
}

export function VoiceCapture({ className }: VoiceCaptureProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
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
