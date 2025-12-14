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
  onSkip: () => void
  isGeneratingQuestions: boolean
  questions: string[]
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

export function HatStep({
  hatColor,
  hatName,
  hatEmoji,
  hatDescription,
  decisionTitle,
  decisionDescription,
  onNext,
  onSkip,
  isGeneratingQuestions,
  questions
}: HatStepProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [additionalThoughts, setAdditionalThoughts] = useState('')

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className={`p-6 border-2 ${hatColors[hatColor]}`}>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{hatEmoji}</span>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${hatTextColors[hatColor]}`}>
              {hatName}
            </h2>
            <p className={`text-sm mt-1 ${hatColor === 'black' ? 'text-gray-300' : 'text-gray-600'}`}>
              {hatDescription}
            </p>
          </div>
        </div>

        {/* Decision Reminder */}
        <div className={`p-4 rounded-lg ${hatColor === 'black' ? 'bg-gray-700' : 'bg-white'} border ${hatColor === 'black' ? 'border-gray-600' : 'border-gray-200'}`}>
          <h3 className={`font-semibold mb-2 ${hatTextColors[hatColor]}`}>
            Twoja decyzja:
          </h3>
          <p className={`font-medium ${hatTextColors[hatColor]}`}>{decisionTitle}</p>
          <p className={`text-sm mt-1 ${hatColor === 'black' ? 'text-gray-300' : 'text-gray-600'}`}>
            {decisionDescription}
          </p>
        </div>
      </Card>

      {/* Questions */}
      {isGeneratingQuestions ? (
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Generuję pytania...</span>
          </div>
        </Card>
      ) : (
        <Card className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">Pytania do rozważenia:</h3>
          
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {index + 1}. {question}
              </label>
              <Textarea
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Twoja odpowiedź..."
                rows={3}
                className="w-full"
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
              placeholder="Czy masz jakieś dodatkowe przemyślenia na ten temat?"
              rows={4}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onSkip}>
              Pomiń
            </Button>
            <Button onClick={handleNext}>
              Następny kapelusz
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
