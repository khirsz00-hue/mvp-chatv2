'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Plus } from '@phosphor-icons/react'
import { Card, CardHeader, CardTitle, CardDescription, Button } from '../ui'
import DecisionList from './DecisionList'
import DecisionForm from './DecisionForm'
import DecisionDetail from './DecisionDetail'
import type { Decision, DecisionWithOptions } from '@/lib/types/decisions'

// Mock user ID - in production, this should come from auth context
const MOCK_USER_ID = 'mock-user-id'

export default function DecisionAssistant() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [selectedDecision, setSelectedDecision] = useState<DecisionWithOptions | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load decisions on mount
  useEffect(() => {
    loadDecisions()
  }, [])

  const loadDecisions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/decisions?userId=${MOCK_USER_ID}`)
      const data = await response.json()
      setDecisions(data.decisions || [])
    } catch (error) {
      console.error('Error loading decisions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDecision = async (input: { title: string; description?: string; context?: string }) => {
    try {
      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: MOCK_USER_ID,
          ...input,
        }),
      })
      const data = await response.json()
      
      if (data.decision) {
        await loadDecisions()
        setIsCreating(false)
        // Open the newly created decision
        handleSelectDecision(data.decision.id)
      }
    } catch (error) {
      console.error('Error creating decision:', error)
    }
  }

  const handleSelectDecision = async (decisionId: string) => {
    try {
      const response = await fetch(`/api/decisions/${decisionId}`)
      const data = await response.json()
      setSelectedDecision(data.decision)
      setIsCreating(false)
    } catch (error) {
      console.error('Error loading decision:', error)
    }
  }

  const handleBackToList = () => {
    setSelectedDecision(null)
    setIsCreating(false)
    loadDecisions()
  }

  const handleDeleteDecision = async (decisionId: string) => {
    try {
      await fetch(`/api/decisions/${decisionId}`, {
        method: 'DELETE',
      })
      await loadDecisions()
      setSelectedDecision(null)
    } catch (error) {
      console.error('Error deleting decision:', error)
    }
  }

  // Render views based on state
  if (isCreating) {
    return (
      <div className="max-w-4xl mx-auto">
        <DecisionForm
          onSubmit={handleCreateDecision}
          onCancel={() => setIsCreating(false)}
        />
      </div>
    )
  }

  if (selectedDecision) {
    return (
      <div className="max-w-6xl mx-auto">
        <DecisionDetail
          decision={selectedDecision}
          onBack={handleBackToList}
          onUpdate={handleBackToList}
          onDelete={handleDeleteDecision}
        />
      </div>
    )
  }

  // Main list view
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
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
                  AI pomaga Ci w podejmowaniu trudnych decyzji
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2"
            >
              <Plus weight="bold" />
              Nowa decyzja
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Decision List */}
      <DecisionList
        decisions={decisions}
        isLoading={isLoading}
        onSelectDecision={handleSelectDecision}
      />
    </div>
  )
}
