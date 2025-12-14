'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/components/ui/Toast'
import { HatColor, Decision, DecisionOption } from '../types'
import { ProgressBar } from './ProgressBar'
import { HatStep } from './HatStep'
import { DecisionSummary } from './DecisionSummary'
import { DecisionService } from '../services/decisionService'
import { hasAnyRealUserInput } from '../utils/validation'

interface DecisionProcessProps {
  decisionId: string
  onBack: () => void
}

interface HatInfo {
  color: HatColor
  name: string
  emoji: string
  description: string
}

const HATS: HatInfo[] = [
  { color: 'blue', name: 'Niebieski Kapelusz', emoji: '🔵', description: 'Definicja i organizacja' },
  { color: 'white', name: 'Biały Kapelusz', emoji: '⚪', description: 'Fakty i informacje' },
  { color: 'red', name: 'Czerwony Kapelusz', emoji: '🔴', description: 'Emocje i intuicje' },
  { color: 'black', name: 'Czarny Kapelusz', emoji: '⚫', description: 'Krytyka i ostrożność' },
  { color: 'yellow', name: 'Żółty Kapelusz', emoji: '🟡', description: 'Optymizm i wartość' },
  { color: 'green', name: 'Zielony Kapelusz', emoji: '🟢', description: 'Kreatywność i pomysły' }
]

export function DecisionProcess({ decisionId, onBack }: DecisionProcessProps) {
  const { showToast } = useToast()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [options, setOptions] = useState<DecisionOption[]>([])
  const [currentHatIndex, setCurrentHatIndex] = useState(0)
  const [questions, setQuestions] = useState<string[]>([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    loadDecision()
  }, [decisionId])

  useEffect(() => {
    if (decision) {
      generateQuestions()
    }
  }, [currentHatIndex, decision])

  const loadDecision = async () => {
    try {
      const result = await DecisionService.getDecision(decisionId)
      setDecision(result.decision)
      setOptions(result.options)
      
      // Check if decision is completed and has summary
      if (result.decision.status === 'completed') {
        // Try to load existing summary
        const events = await DecisionService.getEvents(decisionId)
        const summaryEvent = events.find(e => e.event_type === 'synthesis' && e.ai_response)
        if (summaryEvent && summaryEvent.ai_response) {
          try {
            const summaryData = JSON.parse(summaryEvent.ai_response)
            setSummary(summaryData)
            setShowSummary(true)
          } catch (e) {
            // If parsing fails, continue to start process
          }
        }
      }
    } catch (error) {
      console.error('Error loading decision:', error)
      showToast('Nie udało się załadować decyzji', 'error')
    }
  }

  const generateQuestions = async () => {
    if (!decision) return

    setIsGeneratingQuestions(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const currentHat = HATS[currentHatIndex]
      const response = await fetch(`/api/decision/${decisionId}/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          hatColor: currentHat.color
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate questions')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error: any) {
      console.error('Error generating questions:', error)
      showToast(error.message || 'Nie udało się wygenerować pytań', 'error')
      // Set empty questions on error - user can skip or retry
      setQuestions([])
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  const handleNext = async (responses: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const currentHat = HATS[currentHatIndex]

      // Save responses
      const saveResponse = await fetch(`/api/decision/${decisionId}/save-responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          hatColor: currentHat.color,
          responses
        })
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        throw new Error(errorData.error || 'Failed to save responses')
      }

      // Update decision status to in_progress if it's first response
      if (decision?.status === 'draft') {
        await DecisionService.updateDecision(decisionId, { status: 'in_progress' })
      }

      // Move to next hat or show summary
      if (currentHatIndex < HATS.length - 1) {
        setCurrentHatIndex(prev => prev + 1)
      } else {
        // All hats completed, generate summary
        await generateSummary()
      }
    } catch (error: any) {
      console.error('Error saving responses:', error)
      showToast(error.message || 'Nie udało się zapisać odpowiedzi', 'error')
    }
  }

  const handleSkip = async () => {
    // Just move to next hat without saving
    if (currentHatIndex < HATS.length - 1) {
      setCurrentHatIndex(prev => prev + 1)
    } else {
      // All hats completed, generate summary
      await generateSummary()
    }
  }

  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Get all saved events to check if user provided real answers
      const events = await DecisionService.getEvents(decisionId)
      
      // Check if user provided ANY real answers
      if (!hasAnyRealUserInput(events)) {
        setSummary({
          noAnswers: true,
          message: 'Nie udzieliłeś odpowiedzi na żadne pytania. Aby otrzymać analizę, wróć i odpowiedz przynajmniej na kilka pytań.',
          perspectives: [],
          insights: [],
          recommendation: ''
        })
        setShowSummary(true)
        setIsGeneratingSummary(false)
        return
      }

      const response = await fetch(`/api/decision/${decisionId}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
      setShowSummary(true)
      
      // Update decision status to completed
      await DecisionService.updateDecision(decisionId, { status: 'completed' })
      showToast('Analiza zakończona!', 'success')
    } catch (error: any) {
      console.error('Error generating summary:', error)
      showToast(error.message || 'Nie udało się wygenerować podsumowania', 'error')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  if (!decision) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Ładowanie decyzji...</span>
        </div>
      </div>
    )
  }

  if (showSummary && summary) {
    return (
      <DecisionSummary
        summary={summary}
        decisionTitle={decision.title}
        onBack={onBack}
        isLoading={isGeneratingSummary}
      />
    )
  }

  if (isGeneratingSummary) {
    return (
      <DecisionSummary
        summary={{ perspectives: [], insights: [], recommendation: '' }}
        decisionTitle={decision.title}
        onBack={onBack}
        isLoading={true}
      />
    )
  }

  const currentHat = HATS[currentHatIndex]

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <ProgressBar currentStep={currentHatIndex + 1} totalSteps={HATS.length} />

      {/* Hat Step */}
      <HatStep
        hatColor={currentHat.color}
        hatName={currentHat.name}
        hatEmoji={currentHat.emoji}
        hatDescription={currentHat.description}
        decisionTitle={decision.title}
        decisionDescription={decision.description}
        onNext={handleNext}
        onSkip={handleSkip}
        isGeneratingQuestions={isGeneratingQuestions}
        questions={questions}
      />
    </div>
  )
}
