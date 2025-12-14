'use client'

import React from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { ArrowLeft } from '@phosphor-icons/react'

interface Perspective {
  hat: string
  name: string
  synthesis: string
}

interface SummaryData {
  perspectives: Perspective[]
  insights: string[]
  recommendation: string
}

interface DecisionSummaryProps {
  summary: SummaryData
  decisionTitle: string
  onBack: () => void
  isLoading?: boolean
}

export function DecisionSummary({
  summary,
  decisionTitle,
  onBack,
  isLoading = false
}: DecisionSummaryProps) {
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Generuję podsumowanie...</h3>
              <p className="text-gray-600">AI analizuje wszystkie perspektywy i przygotowuje finalne wnioski</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={20} weight="bold" />
          Powrót do listy
        </Button>
      </div>

      {/* Title */}
      <Card className="p-6 bg-gradient-to-r from-brand-purple/5 to-brand-pink/5 border-brand-purple/20">
        <div className="text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-3xl font-bold mb-2">Podsumowanie analizy</h1>
          <p className="text-xl text-gray-700">{decisionTitle}</p>
        </div>
      </Card>

      {/* Perspectives */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Synteza z każdej perspektywy</h2>
        {summary.perspectives.map((perspective, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">{perspective.hat}</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{perspective.name}</h3>
                <p className="text-gray-700 leading-relaxed">{perspective.synthesis}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Key Insights */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Kluczowe wnioski</h2>
        <ul className="space-y-3">
          {summary.insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="text-brand-purple font-bold flex-shrink-0 mt-1">•</span>
              <p className="text-gray-700 leading-relaxed">{insight}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Final Recommendation */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <h2 className="text-2xl font-bold mb-4 text-green-900">
          Rekomendacja finalna
        </h2>
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {summary.recommendation}
        </p>
      </Card>

      {/* Action */}
      <div className="flex justify-center pt-4">
        <Button onClick={onBack} size="lg" className="gap-2">
          <ArrowLeft size={20} weight="bold" />
          Powrót do listy decyzji
        </Button>
      </div>
    </div>
  )
}
