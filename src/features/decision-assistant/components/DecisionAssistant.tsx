'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Plus } from '@phosphor-icons/react'
import { Card, CardHeader, CardTitle, CardDescription, Button, Input, Textarea } from '@/components/ui'
import { supabase } from '@/lib/supabaseClient'
import { Decision, DecisionOption } from '../types'
import { DecisionDetail } from './DecisionDetail'

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

export function DecisionAssistant() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<Array<{ title: string; description: string }>>([
    { title: '', description: '' }
  ])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchDecisions()
    }
  }, [userId])

  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchDecisions = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDecisions(data || [])
    } catch (error) {
      console.error('Error fetching decisions:', error)
      showToast('Nie udało się pobrać decyzji', 'error')
    }
  }

  const handleCreateDecision = async () => {
    if (!userId || !title.trim() || !description.trim()) {
      showToast('Wypełnij wszystkie wymagane pola', 'error')
      return
    }

    setLoading(true)
    try {
      const validOptions = options.filter(opt => opt.title.trim())

      const response = await fetch('/api/decision/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: title.trim(),
          description: description.trim(),
          options: validOptions.length > 0 ? validOptions : undefined
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
        setOptions([{ title: '', description: '' }])
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

  const handleAddOption = () => {
    setOptions([...options, { title: '', description: '' }])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, field: 'title' | 'description', value: string) => {
    const newOptions = [...options]
    newOptions[index][field] = value
    setOptions(newOptions)
  }

  if (selectedDecisionId) {
    return (
      <DecisionDetail
        decisionId={selectedDecisionId}
        onBack={() => {
          setSelectedDecisionId(null)
          fetchDecisions()
        }}
      />
    )
  }

  if (showCreateForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Nowa Decyzja</CardTitle>
            <CardDescription>Opisz decyzję, którą chcesz podjąć</CardDescription>
          </CardHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tytuł *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. Zmiana pracy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Opis *</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz szczegóły decyzji..."
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Opcje (opcjonalne)</label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={option.title}
                    onChange={(e) => handleOptionChange(index, 'title', e.target.value)}
                    placeholder={`Opcja ${index + 1}`}
                    className="flex-1"
                  />
                  {options.length > 1 && (
                    <Button
                      onClick={() => handleRemoveOption(index)}
                      variant="outline"
                      size="sm"
                    >
                      Usuń
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={handleAddOption} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj opcję
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateDecision} disabled={loading}>
                {loading ? 'Tworzenie...' : 'Utwórz decyzję'}
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline">
                Anuluj
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' :
          toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white z-50`}>
          {toast.message}
        </div>
      )}

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Brain className="w-8 h-8 text-orange-500" weight="duotone" />
              </div>
              <div>
                <CardTitle className="text-2xl">Asystent Decyzji</CardTitle>
                <CardDescription>
                  AI pomaga Ci w podejmowaniu trudnych decyzji metodą Six Thinking Hats
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus weight="bold" />
              Nowa decyzja
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="glass">
        <div className="p-6">
          {decisions.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="duotone" />
              <p className="text-muted-foreground">Nie masz jeszcze żadnych decyzji</p>
              <p className="text-sm text-muted-foreground mt-2">
                Kliknij &quot;Nowa decyzja&quot; aby rozpocząć
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  onClick={() => setSelectedDecisionId(decision.id)}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{decision.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {decision.description}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      decision.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                      decision.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {decision.status === 'draft' ? 'Szkic' :
                       decision.status === 'in_progress' ? 'W trakcie' :
                       'Zakończone'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Utworzono: {new Date(decision.created_at).toLocaleDateString('pl-PL')}</span>
                    {decision.current_hat && (
                      <span>Aktualny kapelusz: {decision.current_hat}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default DecisionAssistant
