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

interface OptionAnalysis {
  option: string
  pros: string[]
  cons: string[]
  score: string
  summary: string
}

interface RecommendedOption {
  option: string
  reasoning: string
}

interface SummaryData {
  noAnswers?: boolean
  message?: string
  perspectives: Perspective[]
  insights: string[]
  options_analysis?: OptionAnalysis[]
  recommended_option?: RecommendedOption
  next_steps?: string[]
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
  // Handle NO ANSWERS case first (before loading check)
  if (summary.noAnswers) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
        <Card className="p-6 sm:p-12 text-center bg-yellow-50 border-2 border-yellow-300">
          <div className="text-4xl sm:text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Brak odpowiedzi</h1>
          <p className="text-base sm:text-lg mb-6">
            {summary.message || 'Nie można wygenerować analizy, ponieważ nie udzieliłeś odpowiedzi na żadne pytania.'}
          </p>
          <p className="text-sm sm:text-base text-gray-600 mb-8">
            Wróć i odpowiedz przynajmniej na kilka pytań z różnych perspektyw.
          </p>
          <Button onClick={onBack} className="w-full sm:w-auto">Powrót</Button>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0">
        <Card className="p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Generuję podsumowanie...</h3>
              <p className="text-sm sm:text-base text-gray-600">AI analizuje wszystkie perspektywy i przygotowuje finalne wnioski</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0 h-full overflow-y-auto scrollable pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={20} weight="bold" />
          <span className="hidden sm:inline">Powrót do listy</span>
          <span className="sm:hidden">Powrót</span>
        </Button>
      </div>

      {/* Title */}
      <Card className="p-4 sm:p-6 bg-gradient-to-r from-brand-purple/5 to-brand-pink/5 border-brand-purple/20">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl mb-3">🎯</div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Podsumowanie analizy</h1>
          <p className="text-lg sm:text-xl text-gray-700 break-words">{decisionTitle}</p>
        </div>
      </Card>

      {/* Perspectives */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold">Synteza z każdej perspektywy</h2>
        {summary.perspectives.map((perspective, index) => (
          <Card key={index} className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl sm:text-3xl flex-shrink-0">{perspective.hat}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-2">{perspective.name}</h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">{perspective.synthesis}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Key Insights */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Kluczowe wnioski</h2>
        <ul className="space-y-3">
          {summary.insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="text-brand-purple font-bold flex-shrink-0 mt-1">•</span>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">{insight}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Options Analysis */}
      {summary.options_analysis && summary.options_analysis.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Analiza opcji</h2>
          <div className="space-y-4">
            {summary.options_analysis.map((option, i) => (
              <Card key={i} className="p-3 sm:p-4 border-2">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-base sm:text-lg break-words">{option.option}</h3>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold text-sm whitespace-nowrap">
                    {option.score}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-3 break-words">{option.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-green-700 mb-1 text-sm sm:text-base">✓ Zalety:</p>
                    <ul className="text-xs sm:text-sm space-y-1">
                      {option.pros.map((pro, j) => (
                        <li key={j} className="text-gray-700 break-words">• {pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-red-700 mb-1 text-sm sm:text-base">✗ Wady:</p>
                    <ul className="text-xs sm:text-sm space-y-1">
                      {option.cons.map((con, j) => (
                        <li key={j} className="text-gray-700 break-words">• {con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Recommended Option */}
      {summary.recommended_option && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="text-3xl sm:text-4xl">🎯</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-2">
                Rekomendowana opcja
              </h2>
              <p className="text-lg sm:text-xl font-semibold text-green-900 mb-3 break-words">
                {summary.recommended_option.option}
              </p>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed break-words">
                {summary.recommended_option.reasoning}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Next Steps */}
      {summary.next_steps && summary.next_steps.length > 0 && (
        <Card className="p-4 sm:p-6 bg-blue-50">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">🚀 Następne kroki</h2>
          <ol className="space-y-3">
            {summary.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                  {i + 1}
                </span>
                <span className="pt-1 text-sm sm:text-base break-words">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Final Recommendation */}
      <Card className="p-4 sm:p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-green-900">
          Rekomendacja finalna
        </h2>
        <p className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
          {summary.recommendation}
        </p>
      </Card>

      {/* Action */}
      <div className="flex justify-center pt-4">
        <Button onClick={onBack} size="lg" className="gap-2 w-full sm:w-auto">
          <ArrowLeft size={20} weight="bold" />
          Powrót do listy decyzji
        </Button>
      </div>
    </div>
  )
}
