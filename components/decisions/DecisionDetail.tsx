'use client'

import React, { useState } from 'react'
import { ArrowLeft, Plus, Trash, Sparkle } from '@phosphor-icons/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import AIAnalysisPanel from './AIAnalysisPanel'
import type { DecisionWithOptions } from '@/lib/types/decisions'

interface DecisionDetailProps {
  decision: DecisionWithOptions
  onBack: () => void
  onUpdate: () => void
  onDelete: (id: string) => void
}

export default function DecisionDetail({ decision, onBack, onUpdate, onDelete }: DecisionDetailProps) {
  const [isAddingOption, setIsAddingOption] = useState(false)
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [newOptionDescription, setNewOptionDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const handleAddOption = async () => {
    if (!newOptionLabel.trim()) return

    try {
      const response = await fetch('/api/decisions/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision_id: decision.id,
          label: newOptionLabel.trim(),
          description: newOptionDescription.trim() || undefined,
        }),
      })

      if (response.ok) {
        setNewOptionLabel('')
        setNewOptionDescription('')
        setIsAddingOption(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error adding option:', error)
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch(`/api/decisions/${decision.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'full' }),
      })
      const data = await response.json()
      setAnalysisResult(data.analysis)
    } catch (error) {
      console.error('Error analyzing decision:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleMarkAsDecided = async () => {
    try {
      await fetch(`/api/decisions/${decision.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'decided' }),
      })
      onUpdate()
    } catch (error) {
      console.error('Error updating decision:', error)
    }
  }

  const statusLabels: Record<string, string> = {
    pending: 'Do rozważenia',
    analyzing: 'Analizuję...',
    analyzed: 'Przeanalizowana',
    decided: 'Zdecydowano',
    archived: 'Archiwum',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" onClick={onBack} className="p-2">
                  <ArrowLeft />
                </Button>
                <CardTitle className="text-2xl">{decision.title}</CardTitle>
              </div>
              {decision.description && (
                <CardDescription className="ml-11">
                  {decision.description}
                </CardDescription>
              )}
            </div>
            <Badge variant={decision.status === 'decided' ? 'green' : 'default'}>
              {statusLabels[decision.status] || decision.status}
            </Badge>
          </div>
          {decision.context && (
            <div className="ml-11 mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{decision.context}</p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Options Section */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Opcje do rozważenia</CardTitle>
            {!isAddingOption && (
              <Button
                variant="ghost"
                onClick={() => setIsAddingOption(true)}
                className="flex items-center gap-2"
              >
                <Plus weight="bold" />
                Dodaj opcję
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add option form */}
          {isAddingOption && (
            <div className="p-4 border-2 border-dashed border-brand-purple rounded-lg space-y-3">
              <Input
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder="Nazwa opcji"
                autoFocus
              />
              <Textarea
                value={newOptionDescription}
                onChange={(e) => setNewOptionDescription(e.target.value)}
                placeholder="Opis opcji (opcjonalnie)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddOption} disabled={!newOptionLabel.trim()}>
                  Dodaj
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAddingOption(false)
                    setNewOptionLabel('')
                    setNewOptionDescription('')
                  }}
                >
                  Anuluj
                </Button>
              </div>
            </div>
          )}

          {/* Options list */}
          {decision.options && decision.options.length > 0 ? (
            <div className="space-y-3">
              {decision.options.map((option, index) => (
                <div
                  key={option.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-brand-purple transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">
                        {index + 1}. {option.label}
                      </h4>
                      {option.description && (
                        <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                      )}
                      {(option.pros && option.pros.length > 0) && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-green-600 mb-1">Zalety:</p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {option.pros.map((pro, i) => (
                              <li key={i}>✓ {pro}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(option.cons && option.cons.length > 0) && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-1">Wady:</p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {option.cons.map((con, i) => (
                              <li key={i}>✗ {con}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Brak opcji. Dodaj opcje do rozważenia.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      <AIAnalysisPanel
        decision={decision}
        analysisResult={analysisResult}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
      />

      {/* Actions */}
      <Card className="glass">
        <CardFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('Czy na pewno chcesz usunąć tę decyzję?')) {
                onDelete(decision.id)
              }
            }}
            className="flex items-center gap-2"
          >
            <Trash weight="bold" />
            Usuń decyzję
          </Button>
          
          {decision.status !== 'decided' && (
            <Button
              variant="success"
              onClick={handleMarkAsDecided}
            >
              Oznacz jako zdecydowane
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
