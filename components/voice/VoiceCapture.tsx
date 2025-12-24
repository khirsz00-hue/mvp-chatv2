'use client'

import { useState } from 'react'
import { Microphone } from '@phosphor-icons/react'
import { VoiceRambleModal } from './VoiceRambleModal'

export function VoiceCapture() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpenModal}
          className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 bg-gradient-to-r from-brand-purple to-brand-pink hover:scale-110 text-white"
          title="Dyktuj zadania głosem"
        >
          <Microphone size={28} weight="fill" />
        </button>
      </div>

      <VoiceRambleModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  )
}
