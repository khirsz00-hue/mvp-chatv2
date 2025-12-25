'use client'

import { Plus } from '@phosphor-icons/react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface FloatingAddButtonProps {
  onClick: () => void
  className?: string
}

export function FloatingAddButton({ onClick, className }: FloatingAddButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`w-14 h-14 rounded-full
                     bg-gradient-to-r from-purple-600 to-pink-600
                     text-white
                     shadow-lg hover:shadow-xl
                     hover:scale-110
                     transition-all duration-200
                     flex items-center justify-center
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${className || ''}`}
          aria-label="Dodaj zadanie"
        >
          <Plus size={28} weight="bold" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-gray-900 text-white px-3 py-2">
        <p className="text-sm font-medium">Dodaj zadanie</p>
        <p className="text-xs text-gray-400 mt-1">Shift+Q</p>
      </TooltipContent>
    </Tooltip>
  )
}
