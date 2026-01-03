/**
 * DecisionLogPanel Component
 * Shows recent decisions with timestamps
 * Allows logging new decisions via modal/input
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus, NotePencil } from '@phosphor-icons/react'

export interface Decision {
  id: string
  text: string
  timestamp: string
}

export interface DecisionLogPanelProps {
  decisions: Decision[]
  onLogDecision?: (text: string) => void
}

export function DecisionLogPanel({ decisions, onLogDecision }: DecisionLogPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newDecisionText, setNewDecisionText] = useState('')

  const handleAdd = () => {
    if (newDecisionText.trim() && onLogDecision) {
      onLogDecision(newDecisionText.trim())
      setNewDecisionText('')
      setIsAdding(false)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <NotePencil size={20} weight="fill" />
            Decision Log
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus size={16} weight="bold" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        
        {/* Add decision input */}
        {isAdding && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <textarea
              value={newDecisionText}
              onChange={(e) => setNewDecisionText(e.target.value)}
              placeholder="Opisz swoją decyzję..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newDecisionText.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Zapisz
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setNewDecisionText('')
                }}
              >
                Anuluj
              </Button>
            </div>
          </div>
        )}

        {/* Decisions list */}
        {decisions.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <p>Brak zapisanych decyzji</p>
            <p className="text-xs mt-1">Kliknij + aby dodać</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {decisions.map((decision) => (
              <div
                key={decision.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{decision.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(decision.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
