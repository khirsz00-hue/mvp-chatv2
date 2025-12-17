'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { Plus, Trash, Eye } from '@phosphor-icons/react'
import { Decision } from '../types'
import { DecisionProcess } from './DecisionProcess'

export function DecisionAssistant() {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      setIsCheckingAuth(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      setIsCheckingAuth(false)
    }
    getUser()
  }, [])

  // Fetch decisions
  const fetchDecisions = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/decision/list`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const data = await response. json()

      if (response. ok) {
        setDecisions(data.decisions || [])
      } else {
        throw new Error(data.error)
      }
    } catch (err:  any) {
      console.error('Error fetching decisions:', err)
      showToast('Nie udało się pobrać decyzji', 'error')
    } finally {
      setLoading(false)
    }
  }, [userId, showToast])

  useEffect(() => {
    if (userId) {
      fetchDecisions()
    }
  }, [userId, fetchDecisions])

  // Create decision
  const handleCreateDecision = async () => {
    if (!userId || !title.trim() || !description.trim()) {
      showToast('Wypełnij wszystkie wymagane pola', 'error')
      return
    }

    setLoading(true)
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/decision/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create decision')
      }

      const data = await response.json()

      if (data.decision) {
        await fetchDecisions()
        setTitle('')
        setDescription('')
        setShowCreateForm(false)
        showToast('Decyzja utworzona!', 'success')
      }
    } catch (err: any) {
      console.error('Error creating decision:', err)
      showToast(err.message || 'Nie udało się utworzyć decyzji', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Delete decision
  const handleDeleteDecision = async (decisionId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę decyzję?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/decision/${decisionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization':  `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        setDecisions(prev => prev.filter(d => d. id !== decisionId))
        showToast('Decyzja usunięta', 'success')
      } else {
        const data = await response.json()
        throw new Error(data. error)
      }
    } catch (err: any) {
      console.error('Error deleting decision:', err)
      showToast('Nie udało się usunąć decyzji', 'error')
    }
  }

  // Check auth loading state
  if (isCheckingAuth) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Asystent Decyzji</h1>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  // No user logged in
  if (!userId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Asystent Decyzji</h1>
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-purple/10 to-brand-pink/10 flex items-center justify-center mb-4">
            🧠
          </div>
          <h2 className="text-xl font-semibold">Zaloguj się</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Aby korzystać z asystenta decyzji, musisz być zalogowany
          </p>
        </Card>
      </div>
    )
  }

  // Show decision process
  if (selectedDecisionId) {
    return (
      <DecisionProcess
        decisionId={selectedDecisionId}
        onBack={() => {
          setSelectedDecisionId(null)
          fetchDecisions()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Asystent Decyzji
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Podejmuj lepsze decyzje dzięki metodzie 6 kapeluszy myślowych
          </p>
        </div>

        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="gap-2"
          disabled={loading}
        >
          <Plus size={20} weight="bold" />
          Nowa decyzja
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Nowa decyzja</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tytuł decyzji *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Zmiana pracy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Opis sytuacji *
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz szczegółowo sytuację decyzyjną..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setTitle('')
                  setDescription('')
                }}
                disabled={loading}
              >
                Anuluj
              </Button>
              <Button onClick={handleCreateDecision} disabled={loading}>
                {loading ? 'Tworzenie...' : 'Utwórz decyzję'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Decisions List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Twoje decyzje</h2>

        {loading ? (
          <Card className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Ładowanie decyzji...</span>
            </div>
          </Card>
        ) : decisions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Brak decyzji
            </h3>
            <p className="text-gray-500">
              Utwórz swoją pierwszą decyzję i skorzystaj z pomocy AI
            </p>
          </Card>
        ) : (
          decisions.map((decision) => (
            <Card key={decision.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{decision.title}</h3>
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {decision.description}
                  </p>
                  <div className="flex items-center gap-3">
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
                        :  'Szkic'}
                    </span>
                    {decision.current_hat && (
                      <span className="text-sm text-gray-500">
                        Aktualny etap: {getHatEmoji(decision.current_hat)} {getHatName(decision.current_hat)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDecisionId(decision.id)}
                    className="gap-1"
                  >
                    <Eye size={16} weight="bold" />
                    Szczegóły
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDecision(decision.id)}
                    className="gap-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash size={16} weight="bold" />
                    Usuń
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// Helper functions
function getHatEmoji(hat:  string): string {
  const emojis:  Record<string, string> = {
    blue: '🔵',
    white: '⚪',
    red: '🔴',
    black: '⚫',
    yellow: '🟡',
    green: '🟢'
  }
  return emojis[hat] || '🎩'
}

function getHatName(hat: string): string {
  const names: Record<string, string> = {
    blue: 'Start/Synteza',
    white: 'Fakty',
    red: 'Emocje',
    black: 'Ryzyka',
    yellow: 'Korzyści',
    green: 'Pomysły'
  }
  return names[hat] || hat
}
