/**
 * WorkHoursModal Component
 * Simple modal for editing working hours start and end time
 */

'use client'

import { useState, useEffect } from 'react'
import { X } from '@phosphor-icons/react'

interface WorkHoursModalProps {
  isOpen: boolean
  currentStart: string
  currentEnd: string
  onClose: () => void
  onSave: (start: string, end: string) => void
}

export function WorkHoursModal({ 
  isOpen, 
  currentStart, 
  currentEnd, 
  onClose, 
  onSave 
}: WorkHoursModalProps) {
  const [start, setStart] = useState(currentStart)
  const [end, setEnd] = useState(currentEnd)

  // Sync state with props when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setStart(currentStart)
      setEnd(currentEnd)
    }
  }, [isOpen, currentStart, currentEnd])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(start, end)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Edit Working Hours</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
            <input 
              type="time" 
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
            <input 
              type="time" 
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
