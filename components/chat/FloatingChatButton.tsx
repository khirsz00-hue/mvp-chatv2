'use client'

import { ChatCircle } from '@phosphor-icons/react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface FloatingChatButtonProps {
  onClick: () => void
  className?: string
}

export function FloatingChatButton({ onClick, className }: FloatingChatButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`w-14 h-14 rounded-full
                     bg-gradient-to-r from-cyan-600 to-blue-600
                     text-white
                     shadow-lg hover:shadow-xl
                     hover:scale-110
                     transition-all duration-200
                     flex items-center justify-center
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className || ''}`}
          aria-label="Czat z asystentem"
        >
          <ChatCircle size={28} weight="fill" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-gray-900 text-white px-3 py-2">
        <p className="text-sm font-medium">Czat z asystentem</p>
        <p className="text-xs text-gray-400 mt-1">Shift+C</p>
      </TooltipContent>
    </Tooltip>
  )
}
