'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Textarea from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft, Play, Check } from '@phosphor-icons/react'
import { Decision, DecisionOption, DecisionEvent } from '../types'
import { HAT_PROMPTS } from '../prompts/hats'

interface DecisionDetailProps {
  decisionId: string
  onBack: () => void
}

export function DecisionDetail({ decisionId, onBack }: DecisionDetailProps) {
  const { showToast } = useToast()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [options, setOptions] = useState<DecisionOption[]>([])
  const [events, setEvents] = useState<DecisionEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [synthesis, setSynthesis] = useState<any>(null)

  // Fetch decision and events
  const fetchDecision = async () => {
    setLoading(true)
    try {
      const [decisionRes, eventsRes] = await Promise.all([
        fetch(`/api/decision/${decisionId}`),
        fetch(`/api/decision/${decisionId}/events`)
      ])

      const decisionData = await decisionRes.json()
      const eventsData = await eventsRes.json()

      if (decisionRes.ok) {
        setDecision(decisionData.decision)
        setOptions(decisionData.options || [])
      }

      if (eventsRes.ok) {
        setEvents(eventsData.events || [])
        
        // Check for synthesis in events
        const synthesisEvent = eventsData.events?.find(
          (e: DecisionEvent) => e.event_type === 'synthesis'
        )
        if (synthesisEvent && synthesisEvent.ai_response) {
          try {
            setSynthesis(JSON.parse(synthesisEvent.ai_response))
          } catch (e) {
            console.error('Error parsing synthesis:', e)
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching decision:', err)
      showToast('Nie udało się pobrać decyzji', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDecision()
  }, [decisionId])

  // Run AI analysis
  const handleRunAnalysis = async () => {
    if (!decision) return

    setAnalyzing(true)
    try {
      const response = await fetch(`/api/decision/${decisionId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: userInput.trim() || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setUserInput('')
        
        if (data.complete && data.synthesis) {
          setSynthesis(data.synthesis)
          showToast('Analiza ukończona! Podsumowanie gotowe.', 'success')
        } else {
          showToast(`Analiza ${getHatName(data.hatColor)} ukończona`, 'success')
        }

        // Refresh decision and events
        await fetchDecision()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      console.error('Error running analysis:', err)
      showToast('Nie udało się uruchomić analizy', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading || !decision) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={20} />
          Powrót
        </Button>
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Ładowanie...</span>
          </div>
        </Card>
      </div>
    )
  }

  const currentHat = decision.current_hat || 'blue'
  const currentHatInfo = HAT_PROMPTS[currentHat]
  const isComplete = decision.status === 'completed'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={20} />
          Powrót
        </Button>
      </div>

      {/* Decision Info */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{decision.title}</h1>
            <p className="text-gray-600 mb-4">{decision.description}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              decision.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : decision.status === 'in_progress'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {decision.status === 'completed'
              ? 'Ukończono'
              : decision.status === 'in_progress'
              ? 'W trakcie'
              : 'Szkic'}
          </span>
        </div>

        {options.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Opcje do rozważenia:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {options.map((opt) => (
                <li key={opt.id}>
                  <strong>{opt.title}</strong>
                  {opt.description && `: ${opt.description}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Synthesis - shown when complete */}
      {isComplete && synthesis && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Check size={24} weight="bold" className="text-green-600" />
            Podsumowanie i Rekomendacje
          </h2>

          <div className="space-y-4">
            {synthesis.facts && synthesis.facts.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  ⚪ Fakty
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {synthesis.facts.map((fact: string, i: number) => (
                    <li key={i}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.emotions && synthesis.emotions.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  🔴 Emocje
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {synthesis.emotions.map((emotion: string, i: number) => (
                    <li key={i}>{emotion}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.risks && synthesis.risks.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  ⚫ Ryzyka
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {synthesis.risks.map((risk: string, i: number) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.benefits && synthesis.benefits.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  🟡 Korzyści
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {synthesis.benefits.map((benefit: string, i: number) => (
                    <li key={i}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.ideas && synthesis.ideas.length > 0 && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  🟢 Pomysły
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {synthesis.ideas.map((idea: string, i: number) => (
                    <li key={i}>{idea}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.action_plan && (
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  📋 Plan działań
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{synthesis.action_plan}</p>
              </div>
            )}

            {synthesis.recommendation && (
              <div className="bg-white p-4 rounded-lg mt-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  💡 Rekomendacja
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{synthesis.recommendation}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Current Hat Analysis */}
      {!isComplete && currentHatInfo && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">{currentHatInfo.emoji}</span>
            {currentHatInfo.title}
          </h2>
          <p className="text-gray-600 mb-4">{currentHatInfo.description}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Twoja odpowiedź lub uwagi (opcjonalne)
              </label>
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Wpisz swoje myśli, odpowiedzi lub dodatkowe informacje..."
                rows={4}
              />
            </div>

            <Button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analizuję...
                </>
              ) : (
                <>
                  <Play size={20} weight="fill" />
                  Uruchom analizę AI
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Events History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Historia analizy</h2>

        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Brak wydarzeń. Uruchom pierwszą analizę.
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const hatInfo = HAT_PROMPTS[event.hat_color]
              return (
                <div
                  key={event.id}
                  className="border-l-4 pl-4 py-2"
                  style={{
                    borderColor: getHatColor(event.hat_color)
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{hatInfo?.emoji || '🎩'}</span>
                    <span className="font-semibold">
                      {hatInfo?.title || event.hat_color}
                    </span>
                    <span className="text-xs text-gray-500">
                      {event.event_type === 'analysis'
                        ? 'Analiza AI'
                        : event.event_type === 'synthesis'
                        ? 'Synteza'
                        : 'Twoja odpowiedź'}
                    </span>
                  </div>

                  {event.event_type === 'user_input' && event.content && (
                    <div className="text-gray-700 mb-2 bg-gray-50 p-3 rounded">
                      <strong>Ty:</strong> {event.content}
                    </div>
                  )}

                  {event.ai_response && event.event_type !== 'synthesis' && (
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {event.ai_response}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// Helper functions
function getHatName(hat: string): string {
  const names: Record<string, string> = {
    blue: 'Błękitny (Start)',
    white: 'Biały (Fakty)',
    red: 'Czerwony (Emocje)',
    black: 'Czarny (Ryzyka)',
    yellow: 'Żółty (Korzyści)',
    green: 'Zielony (Pomysły)'
  }
  return names[hat] || hat
}

function getHatColor(hat: string): string {
  const colors: Record<string, string> = {
    blue: '#3B82F6',
    white: '#9CA3AF',
    red: '#EF4444',
    black: '#1F2937',
    yellow: '#F59E0B',
    green: '#10B981'
  }
  return colors[hat] || '#6B7280'
}
