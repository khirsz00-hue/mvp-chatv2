'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Sparkle, 
  Play,
  SkipForward 
} from '@phosphor-icons/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Textarea } from '../ui'
import { HAT_PROMPTS, HAT_ORDER, getHatProgress } from '@/lib/prompts/sixHats'
import type { Decision, HatColor, HatAnswer, SixHatsSynthesis } from '@/lib/types/decisions'

interface SixHatsWorkflowProps {
  decision: Decision
  onComplete: () => void
  onBack: () => void
}

interface HatState {
  questions: string[]
  userAnswer: string
  aiAnalysis?: string
  isLoading: boolean
  error?: string
}

export default function SixHatsWorkflow({ decision, onComplete, onBack }: SixHatsWorkflowProps) {
  const [currentHatIndex, setCurrentHatIndex] = useState(0)
  const [hatStates, setHatStates] = useState<Record<HatColor, HatState>>({
    blue: { questions: [], userAnswer: '', isLoading: false },
    white: { questions: [], userAnswer: '', isLoading: false },
    red: { questions: [], userAnswer: '', isLoading: false },
    black: { questions: [], userAnswer: '', isLoading: false },
    yellow: { questions: [], userAnswer: '', isLoading: false },
    green: { questions: [], userAnswer: '', isLoading: false },
  })
  const [synthesis, setSynthesis] = useState<SixHatsSynthesis | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoadingSynthesis, setIsLoadingSynthesis] = useState(false)

  const currentHat = HAT_ORDER[currentHatIndex]
  const currentHatInfo = HAT_PROMPTS[currentHat]
  const currentState = hatStates[currentHat]
  const progress = getHatProgress(currentHat)

  // Load questions for current hat
  useEffect(() => {
    if (currentState.questions.length === 0 && !currentState.isLoading) {
      loadQuestions()
    }
  }, [currentHat])

  // Load existing hat answers from decision
  useEffect(() => {
    if (decision.hat_answers && decision.hat_answers.length > 0) {
      const newStates = { ...hatStates }
      decision.hat_answers.forEach(answer => {
        newStates[answer.hat] = {
          questions: answer.questions || [],
          userAnswer: answer.userAnswer || '',
          aiAnalysis: answer.aiAnalysis,
          isLoading: false,
        }
      })
      setHatStates(newStates)
      
      // Check if we should show synthesis
      if (decision.current_hat === null && decision.hat_answers.length === 6) {
        setIsCompleted(true)
        loadSynthesis()
      }
    }
  }, [decision])

  const loadQuestions = async () => {
    setHatStates(prev => ({
      ...prev,
      [currentHat]: { ...prev[currentHat], isLoading: true, error: undefined }
    }))

    try {
      const response = await fetch(`/api/decisions/${decision.id}/hats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_questions',
          hatColor: currentHat,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setHatStates(prev => ({
          ...prev,
          [currentHat]: { 
            ...prev[currentHat], 
            questions: data.questions, 
            isLoading: false 
          }
        }))
      } else {
        throw new Error(data.error || 'Failed to load questions')
      }
    } catch (error: any) {
      console.error('Error loading questions:', error)
      setHatStates(prev => ({
        ...prev,
        [currentHat]: { 
          ...prev[currentHat], 
          isLoading: false,
          error: 'Nie udało się wczytać pytań. Spróbuj ponownie.' 
        }
      }))
    }
  }

  const handleSubmitAnswer = async () => {
    if (!currentState.userAnswer.trim()) {
      return
    }

    setHatStates(prev => ({
      ...prev,
      [currentHat]: { ...prev[currentHat], isLoading: true, error: undefined }
    }))

    try {
      const response = await fetch(`/api/decisions/${decision.id}/hats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_answer',
          hatColor: currentHat,
          userAnswer: currentState.userAnswer,
          questions: currentState.questions,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setHatStates(prev => ({
          ...prev,
          [currentHat]: { 
            ...prev[currentHat], 
            aiAnalysis: data.hatAnswer.aiAnalysis,
            isLoading: false 
          }
        }))

        // Move to next hat or complete
        if (data.completed) {
          setIsCompleted(true)
          if (data.synthesis) {
            setSynthesis(data.synthesis)
          }
        } else {
          setTimeout(() => {
            setCurrentHatIndex(prev => prev + 1)
          }, 1000)
        }
      } else {
        throw new Error(data.error || 'Failed to submit answer')
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error)
      setHatStates(prev => ({
        ...prev,
        [currentHat]: { 
          ...prev[currentHat], 
          isLoading: false,
          error: 'Nie udało się przetworzyć odpowiedzi. Spróbuj ponownie.' 
        }
      }))
    }
  }

  const handleSkipHat = async () => {
    try {
      const response = await fetch(`/api/decisions/${decision.id}/hats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip_hat',
          hatColor: currentHat,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.completed) {
          setIsCompleted(true)
        } else {
          setCurrentHatIndex(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Error skipping hat:', error)
    }
  }

  const loadSynthesis = async () => {
    setIsLoadingSynthesis(true)
    try {
      const response = await fetch(`/api/decisions/${decision.id}/hats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_synthesis',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSynthesis(data.synthesis)
      }
    } catch (error) {
      console.error('Error loading synthesis:', error)
    } finally {
      setIsLoadingSynthesis(false)
    }
  }

  const handleAnswerChange = (value: string) => {
    setHatStates(prev => ({
      ...prev,
      [currentHat]: { ...prev[currentHat], userAnswer: value }
    }))
  }

  const getHatColor = (hat: HatColor): string => {
    const colors: Record<HatColor, string> = {
      blue: '#3B82F6',
      white: '#E5E7EB',
      red: '#EF4444',
      black: '#1F2937',
      yellow: '#F59E0B',
      green: '#10B981',
    }
    return colors[hat]
  }

  const getHatGradient = (hat: HatColor): string => {
    const gradients: Record<HatColor, string> = {
      blue: 'from-blue-50 to-blue-100',
      white: 'from-gray-50 to-gray-100',
      red: 'from-red-50 to-red-100',
      black: 'from-gray-100 to-gray-200',
      yellow: 'from-yellow-50 to-yellow-100',
      green: 'from-green-50 to-green-100',
    }
    return gradients[hat]
  }

  // Show synthesis if completed
  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Check className="w-8 h-8 text-green-600" weight="bold" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Analiza Ukończona!</CardTitle>
                  <CardDescription>
                    Przeszedłeś przez wszystkie 6 kapeluszy myślowych
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="mr-2" />
                Powrót
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Synthesis */}
        {isLoadingSynthesis ? (
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="animate-spin h-8 w-8 border-4 border-brand-purple border-t-transparent rounded-full" />
                <span className="text-lg">Generuję podsumowanie...</span>
              </div>
            </CardContent>
          </Card>
        ) : synthesis ? (
          <Card className="glass bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkle className="text-brand-purple" weight="fill" />
                Synteza i Rekomendacje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-lg font-medium text-gray-800">{synthesis.summary}</p>
              </div>

              {/* Facts */}
              {synthesis.facts && synthesis.facts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">⚪</span>
                    Kluczowe Fakty
                  </h3>
                  <ul className="space-y-2">
                    {synthesis.facts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span className="text-gray-700">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Emotions */}
              {synthesis.emotions && synthesis.emotions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">🔴</span>
                    Emocje i Intuicja
                  </h3>
                  <ul className="space-y-2">
                    {synthesis.emotions.map((emotion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span className="text-gray-700">{emotion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {synthesis.risks && synthesis.risks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">⚫</span>
                    Główne Ryzyka
                  </h3>
                  <ul className="space-y-2">
                    {synthesis.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">⚠️</span>
                        <span className="text-gray-700">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {synthesis.benefits && synthesis.benefits.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">🟡</span>
                    Główne Korzyści
                  </h3>
                  <ul className="space-y-2">
                    {synthesis.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ideas */}
              {synthesis.ideas && synthesis.ideas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">🟢</span>
                    Kreatywne Pomysły
                  </h3>
                  <ul className="space-y-2">
                    {synthesis.ideas.map((idea, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">💡</span>
                        <span className="text-gray-700">{idea}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Options */}
              {synthesis.options && synthesis.options.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Opcje do Rozważenia</h3>
                  <div className="space-y-3">
                    {synthesis.options.map((option, i) => (
                      <div key={i} className="bg-white/70 rounded-lg p-4">
                        <p className="text-gray-800">{option}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {synthesis.recommendation && (
                <div className="bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 rounded-lg p-6 border-2 border-brand-purple">
                  <h3 className="font-bold text-xl mb-3 text-brand-purple flex items-center gap-2">
                    <Sparkle weight="fill" />
                    Rekomendacja
                  </h3>
                  <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                    {synthesis.recommendation}
                  </p>
                </div>
              )}

              {/* Next Steps */}
              {synthesis.nextSteps && synthesis.nextSteps.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Następne Kroki</h3>
                  <ol className="space-y-2">
                    {synthesis.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-purple text-white text-sm font-bold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={onComplete} className="w-full">
                Zakończ i Wróć do Listy
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 mb-4">Trwa generowanie syntezy...</p>
              <Button onClick={loadSynthesis}>
                Wygeneruj Podsumowanie
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    )
  }

  // Show current hat workflow
  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-2" />
              Powrót
            </Button>
            <div className="text-sm text-gray-600">
              Kapelusz {currentHatIndex + 1} z {HAT_ORDER.length}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-purple to-brand-pink"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <CardTitle className="text-xl">{decision.title}</CardTitle>
        </CardHeader>
      </Card>

      {/* Current Hat Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHat}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={`glass bg-gradient-to-br ${getHatGradient(currentHat)}`}>
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="text-6xl p-4 rounded-2xl"
                  style={{ backgroundColor: `${getHatColor(currentHat)}20` }}
                >
                  {currentHatInfo.emoji}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">
                    {currentHatInfo.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {currentHatInfo.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Questions */}
              {currentState.isLoading && currentState.questions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-brand-purple border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-600">Generuję pytania pomocnicze...</p>
                </div>
              ) : currentState.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 mb-3">{currentState.error}</p>
                  <Button onClick={loadQuestions} size="sm">
                    Spróbuj ponownie
                  </Button>
                </div>
              ) : currentState.questions.length > 0 ? (
                <div className="bg-white/70 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">Pytania pomocnicze:</h3>
                  <ul className="space-y-3">
                    {currentState.questions.map((question, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm font-medium flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-gray-700">{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Answer Input */}
              {!currentState.aiAnalysis && currentState.questions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Twoja odpowiedź
                  </label>
                  <Textarea
                    value={currentState.userAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Odpowiedz na pytania powyżej... Możesz pominąć, jeśli nie masz odpowiedzi."
                    rows={6}
                    disabled={currentState.isLoading}
                  />
                </div>
              )}

              {/* AI Analysis */}
              {currentState.aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/70 rounded-lg p-6"
                >
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Sparkle className="text-brand-purple" weight="fill" />
                    Analiza AI
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {currentState.aiAnalysis}
                  </p>
                </motion.div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                variant="ghost"
                onClick={handleSkipHat}
                disabled={currentState.isLoading}
              >
                <SkipForward className="mr-2" />
                Pomiń
              </Button>

              {!currentState.aiAnalysis ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!currentState.userAnswer.trim() || currentState.isLoading}
                  className="gap-2"
                >
                  {currentState.isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Analizuję...
                    </>
                  ) : (
                    <>
                      <Play weight="fill" />
                      Analizuj
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentHatIndex(prev => prev + 1)}
                  className="gap-2"
                >
                  Następny Kapelusz
                  <ArrowRight weight="bold" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Hat Progress Dots */}
      <div className="flex justify-center gap-3">
        {HAT_ORDER.map((hat, index) => {
          const hatInfo = HAT_PROMPTS[hat]
          const isCompleted = hatStates[hat].aiAnalysis !== undefined
          const isCurrent = index === currentHatIndex
          
          return (
            <motion.div
              key={hat}
              className={`flex flex-col items-center gap-1 ${
                isCurrent ? 'scale-110' : 'scale-100'
              }`}
              whileHover={{ scale: 1.1 }}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${
                  isCompleted
                    ? 'ring-4 ring-green-500'
                    : isCurrent
                    ? 'ring-4 ring-brand-purple'
                    : 'ring-2 ring-gray-300'
                }`}
                style={{ backgroundColor: `${getHatColor(hat)}${isCompleted || isCurrent ? '' : '40'}` }}
              >
                {isCompleted ? <Check className="text-white" weight="bold" /> : hatInfo.emoji}
              </div>
              <span className="text-xs text-gray-600 text-center">
                {hat.charAt(0).toUpperCase() + hat.slice(1)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
