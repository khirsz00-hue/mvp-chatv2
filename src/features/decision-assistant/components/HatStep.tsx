'use client'

import React, { useState, useEffect } from 'react'
import { HatColor } from '../types'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import Card from '@/components/ui/Card'

interface Question {
  id: string
  question: string
  answer: string
}

interface HatStepProps {
  hatColor: HatColor
  hatName: string
  hatEmoji: string
  hatDescription: string
  decisionTitle: string
  decisionDescription: string
  onNext: (responses: { questions: Question[]; additionalThoughts: string }) => void
  isGeneratingQuestions: boolean
  questions: string[]
  isLastHat?: boolean
}

const hatColors: Record<HatColor, string> = {
  blue: 'bg-blue-50 border-blue-200',
  white: 'bg-gray-50 border-gray-200',
  red: 'bg-red-50 border-red-200',
  black: 'bg-gray-800 border-gray-700 text-white',
  yellow: 'bg-yellow-50 border-yellow-200',
  green: 'bg-green-50 border-green-200'
}

const hatTextColors: Record<HatColor, string> = {
  blue: 'text-blue-900',
  white: 'text-gray-900',
  red: 'text-red-900',
  black: 'text-white',
  yellow: 'text-yellow-900',
  green: 'text-green-900'
}

function getAdditionalThoughtsPlaceholder(hatColor: HatColor): string {
  const placeholders: Record<HatColor, string> = {
    blue: 'Jakie jeszcze aspekty procesu decyzyjnego chciałbyś rozważyć?',
    white: 'Czy są jeszcze jakieś fakty lub dane, które warto uwzględnić?',
    red: 'Jakie inne emocje lub intuicje towarzyszą Ci przy tej decyzji?',
    black: 'Czy dostrzegasz inne potencjalne zagrożenia lub wątpliwości?',
    yellow: 'Jakie inne korzyści lub pozytywne aspekty widzisz w tej decyzji?',
    green: 'Czy masz inne kreatywne pomysły lub alternatywne rozwiązania?'
  }
  return placeholders[hatColor]
}

export function HatStep({
  hatColor,
  hatName,
  hatEmoji,
  hatDescription,
  decisionTitle,
  decisionDescription,
  onNext,
  isGeneratingQuestions,
  questions,
  isLastHat
}: HatStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [additionalThoughts, setAdditionalThoughts] = useState('')

  // Check if user provided at least ONE answer
  const hasAnyAnswer = Object.values(answers).some(a => a?.trim()) || additionalThoughts?.trim()

  // Reset answers when hat color changes (new hat)
  useEffect(() => {
    setAnswers({})
    setAdditionalThoughts('')
  }, [hatColor])

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: value }))
  }

  const handleNext = () => {
    const questionsWithAnswers: Question[] = questions.map((q, idx) => ({
      id: `q${idx}`,
      question: q,
      answer: answers[idx] || ''
    }))

    onNext({
      questions: questionsWithAnswers,
      additionalThoughts
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <Card className={`p-4 sm:p-6 border-2 ${hatColors[hatColor]}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <span className="text-4xl sm:text-5xl">{hatEmoji}</span>
          <div className="flex-1">
            <h2 className={`text-xl sm:text-2xl font-bold ${hatTextColors[hatColor]}`}>
              {hatName}
            </h2>
            <p className={`text-xs sm:text-sm mt-1 ${hatColor === 'black' ? 'text-gray-300' : 'text-gray-600'}`}>
              {hatDescription}
            </p>
          </div>
        </div>

        {/* Decision Reminder */}
        <div className={`p-3 sm:p-4 rounded-lg ${hatColor === 'black' ? 'bg-gray-700' : 'bg-white'} border ${hatColor === 'black' ? 'border-gray-600' : 'border-gray-200'}`}>
          <h3 className={`font-semibold mb-2 text-sm sm:text-base ${hatTextColors[hatColor]}`}>
            Twoja decyzja:
          </h3>
          <p className={`font-medium text-sm sm:text-base ${hatTextColors[hatColor]} break-words`}>{decisionTitle}</p>
          <p className={`text-xs sm:text-sm mt-1 ${hatColor === 'black' ? 'text-gray-300' : 'text-gray-600'} break-words`}>
            {decisionDescription}
          </p>
        </div>
      </Card>

      {/* Questions */}
      {isGeneratingQuestions ? (
        <Card className="p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-sm sm:text-base text-gray-600">Generuję pytania...</span>
          </div>
        </Card>
      ) : (
        <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-blue-800">
              💡 <strong>Wskazówka:</strong> Odpowiedz przynajmniej na jedno pytanie lub wpisz 
              dodatkowe przemyślenia, aby przejść do kolejnego etapu.
            </p>
          </div>
          
          <h3 className="text-base sm:text-lg font-semibold">Odpowiedz na pytania:</h3>
          
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 break-words">
                {index + 1}. {question}
              </label>
              <Textarea
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Twoja odpowiedź..."
                rows={3}
                className="w-full text-sm sm:text-base"
              />
            </div>
          ))}

          {/* Additional Thoughts */}
          <div className="space-y-2 pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700">
              Dodatkowe przemyślenia:
            </label>
            <Textarea
              value={additionalThoughts}
              onChange={(e) => setAdditionalThoughts(e.target.value)}
              placeholder={getAdditionalThoughtsPlaceholder(hatColor)}
              rows={4}
              className="w-full text-sm sm:text-base"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-stretch sm:items-end gap-3 pt-4">
            {!hasAnyAnswer && (
              <p className="text-xs sm:text-sm text-red-600 font-medium text-center sm:text-right">
                ⚠️ Odpowiedz przynajmniej na jedno pytanie, aby przejść dalej
              </p>
            )}
            <Button
              onClick={handleNext}
              disabled={!hasAnyAnswer}
              className="w-full sm:w-auto"
            >
              {isLastHat ? 'Generuj podsumowanie' : 'Następny kapelusz'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
