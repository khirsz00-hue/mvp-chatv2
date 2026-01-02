'use client'

import { useState, ReactNode } from 'react'
import { CaretDown, CaretUp } from '@phosphor-icons/react'

interface CollapsibleSectionProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
  className = ''
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-purple-600">{icon}</span>}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}
