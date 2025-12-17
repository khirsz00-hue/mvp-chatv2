'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Trash } from '@phosphor-icons/react'
import { Card, CardHeader, CardTitle, Button, Textarea } from '@/components/ui'
import { Decision, DecisionOption, DecisionEvent } from '../types'
import { DecisionService } from '../services/decisionService'
import { AIService } from '../services/aiService'
import { HAT_PROMPTS, HAT_ORDER } from '../prompts/hats'

interface DecisionDetailProps {
  decisionId: string
  onBack: () => void
}

export function DecisionDetail({ decisionId, onBack }: DecisionDetailProps) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [options, setOptions] = useState<DecisionOption[]>([])
  const [events, setEvents] = useState<DecisionEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [aiResponse, setAiResponse] = useState('')

  const loadDecision = useCallback(async () => {
    try {
      const result = await DecisionService.getDecision(decisionId)
      setDecision(result.decision)
      setOptions(result.options)

      const eventsData = await DecisionService.getEvents(decisionId)
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading decision:', error)
    }
  }, [decisionId])

  useEffect(() => {
    loadDecision()
  }, [loadDecision])

  const handleStartAnalysis = async () => {
    if (!decision) return

    try {
      await DecisionService.updateCurrentHat(decision.id, 'blue')
      await loadDecision()
    } catch (error) {
      console.error('Error starting analysis:', error)
    }
  }

  const handleAnalyzeHat = async () => {
    if (!decision || !decision.current_hat) return

    setLoading(true)
    try {
      const hatPrompt = HAT_PROMPTS[decision.current_hat]
      const response = await AIService.analyzeWithHat(
        decision.current_hat,
        decision.title,
        decision.description,
        options,
        hatPrompt.prompt
      )

      setAiResponse(response)

      await DecisionService.addEvent(
        decision.id,
        decision.current_hat,
        'analysis',
        hatPrompt.prompt,
        response
      )

      await loadDecision()
    } catch (error) {
      console.error('Error analyzing hat:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInput = async () => {
    if (!decision || !decision.current_hat || !userInput.trim()) return

    try {
      await DecisionService.addEvent(
        decision.id,
        decision.current_hat,
        'user_input',
        userInput
      )

      setUserInput('')
      await loadDecision()
    } catch (error) {
      console.error('Error saving input:', error)
    }
  }

  const handleNextHat = async () => {
    if (!decision || !decision.current_hat) return

    const currentIndex = HAT_ORDER.indexOf(decision.current_hat)
    const nextHat = currentIndex < HAT_ORDER.length - 1 ? HAT_ORDER[currentIndex + 1] : null

    try {
      await DecisionService.updateCurrentHat(decision.id, nextHat)
      setAiResponse('')
      
      if (!nextHat) {
        await DecisionService.updateDecision(decision.id, { status: 'completed' })
      }
      
      await loadDecision()
    } catch (error) {
      console.error('Error moving to next hat:', error)
    }
  }

  const handleDelete = async () => {
    if (!decision || !confirm('Czy na pewno chcesz usunąć tę decyzję?')) return

    try {
      await DecisionService.deleteDecision(decision.id)
      onBack()
    } catch (error) {
      console.error('Error deleting decision:', error)
    }
  }

  if (!decision) {
    return <div className="text-center py-12">Ładowanie...</div>
  }

  const currentHatInfo = decision.current_hat ? HAT_PROMPTS[decision.current_hat] : null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Powrót
        </Button>
        <Button onClick={handleDelete} variant="outline">
          <Trash className="w-4 h-4 mr-2" />
          Usuń
        </Button>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{decision.title}</CardTitle>
          <p className="text-muted-foreground">{decision.description}</p>
        </CardHeader>
        <div className="p-6">
          {options.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Opcje:</h3>
              <ul className="list-disc list-inside space-y-1">
                {options.map((option) => (
                  <li key={option.id}>
                    {option.title}
                    {option.description && (
                      <span className="text-muted-foreground ml-2">- {option.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!decision.current_hat ? (
            <Button onClick={handleStartAnalysis}>
              Rozpocznij analizę Six Thinking Hats
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{currentHatInfo?.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{currentHatInfo?.title}</h3>
                    <p className="text-sm text-muted-foreground">{currentHatInfo?.description}</p>
                  </div>
                </div>

                <Button onClick={handleAnalyzeHat} disabled={loading}>
                  {loading ? 'Analizuję...' : 'Analizuj z AI'}
                </Button>
              </div>

              {aiResponse && (
                <Card>
                  <div className="p-4">
                    <h4 className="font-semibold mb-2">Odpowiedź AI:</h4>
                    <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                  </div>
                </Card>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Twoje przemyślenia:</label>
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Zapisz swoje myśli..."
                  rows={4}
                />
                <div className="flex gap-2 mt-2">
                  <Button onClick={handleSaveInput} disabled={!userInput.trim()}>
                    Zapisz
                  </Button>
                  <Button onClick={handleNextHat} variant="outline">
                    {decision.current_hat === 'green' ? 'Zakończ analizę' : 'Następny kapelusz'}
                  </Button>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold mb-3">Historia:</h3>
                <div className="space-y-3">
                  {events.map((event) => {
                    const hatInfo = HAT_PROMPTS[event.hat_color]
                    return (
                      <Card key={event.id}>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{hatInfo.emoji}</span>
                            <span className="font-semibold text-sm">{hatInfo.title}</span>
                            <span className="text-xs text-muted-foreground">
                              ({event.event_type})
                            </span>
                          </div>
                          <p className="text-sm">{event.content}</p>
                          {event.ai_response && (
                            <p className="text-sm text-muted-foreground mt-2 border-l-2 pl-3">
                              {event.ai_response}
                            </p>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default DecisionDetail
