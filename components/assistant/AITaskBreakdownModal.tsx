'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Sparkle, 
  Question, 
  ChatCircle, 
  Lightning,
  ListChecks,
  Clock,
  Check,
  X,
  ArrowRight,
  CalendarPlus,
  Lightbulb,
  PaperPlaneRight,
  Robot,
  User,
  ArrowLeft
} from '@phosphor-icons/react'

interface Task {
  id: string
  content: string
  description?:  string
  project_id?:  string
  priority:  1 | 2 | 3 | 4
  due?:  { date: string } | string
}

interface AITaskBreakdownModalProps {
  open: boolean
  onClose: () => void
  task:  Task
  onCreateSubtasks: (subtasks: Array<{
    content: string
    description?: string
    duration?:  number
    duration_unit?: string
  }>) => Promise<void>
}

interface Subtask {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  selected: boolean
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type ViewMode = 'init' | 'questions' | 'chat' | 'subtasks'

export function AITaskBreakdownModal({
  open,
  onClose,
  task,
  onCreateSubtasks
}: AITaskBreakdownModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('init')
  
  // AI Summary
  const [aiSummary, setAiSummary] = useState('')
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  
  // Questions Mode
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  
  // Chat Mode
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  
  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [totalEstimation, setTotalEstimation] = useState<number | undefined>()
  const [bestDayOfWeek, setBestDayOfWeek] = useState<number | undefined>()
  const [bestTimeOfDay, setBestTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | undefined>()
  const [schedulingReasoning, setSchedulingReasoning] = useState<string>('')
  const [tips, setTips] = useState<string[]>([])
  const [isCreatingSubtasks, setIsCreatingSubtasks] = useState(false)
  
  const resetModal = useCallback(() => {
    setViewMode('init')
    setAiSummary('')
    setClarifyQuestions([])
    setCurrentQuestion(0)
    setAnswers([])
    setMessages([])
    setChatInput('')
    setSubtasks([])
    setTotalEstimation(undefined)
    setBestDayOfWeek(undefined)
    setBestTimeOfDay(undefined)
    setSchedulingReasoning('')
    setTips([])
  }, [])
  
  // AI Summary Generation
  const generateAISummary = useCallback(async () => {
    setIsLoadingSummary(true)
    try {
      const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD w zarządzaniu zadaniami. 

Zadanie użytkownika:  "${task.content}"
${task.description ? `Opis: "${task.description}"` : ''}

Napisz krótkie podsumowanie (2-3 zdania) jak rozumiesz to zadanie. 
Pokaż użytkownikowi, że rozumiesz jego intencje i jesteś gotowy pomóc. 
Bądź ciepły, wspierający i konkretny.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Jesteś wspierającym asystentem ADHD.' },
            { role: 'user', content: prompt }
          ]
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate summary')
      
      const data = await res.json()
      setAiSummary(data. response || 'Rozumiem - chcesz zająć się tym zadaniem.  Pomogę Ci je doprecyzować i rozłożyć na kroki.')
    } catch (err) {
      console.error('Error generating AI summary:', err)
      setAiSummary('Rozumiem - chcesz zająć się tym zadaniem.  Pomogę Ci je doprecyzować i rozłożyć na kroki.')
    } finally {
      setIsLoadingSummary(false)
    }
  }, [task])
  
  // Initialize - fetch AI summary
  useEffect(() => {
    if (open && ! aiSummary) {
      generateAISummary()
    }
    
    if (! open) {
      resetModal()
    }
  }, [open, aiSummary, generateAISummary, resetModal])
  
  // Questions Mode - Generate Questions
  const handleStartQuestions = async () => {
    setIsLoadingQuestions(true)
    setViewMode('questions')
    
    try {
      const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD. 

Zadanie:  "${task.content}"
${task.description ? `Opis: "${task.description}"` : ''}

Twoje zrozumienie:  ${aiSummary}

Wygeneruj 3-4 KONKRETNE pytania doprecyzowujące, które dotyczą BEZPOŚREDNIO tego zadania i pomogą Ci rozbić je na kroki. 

Pytania MUSZĄ być:
- Praktyczne (nie ogólne)
- Bezpośrednio związane z tym konkretnym zadaniem
- Pomocne w dekompozycji na subtaski

Przykłady DOBRYCH pytań dla "Napisać raport kwartalny":
- "Jakie sekcje powinien zawierać raport?  (np. wprowadzenie, dane, wnioski)"
- "Czy masz już zebrane dane, czy trzeba je najpierw przygotować?"
- "Dla kogo jest ten raport i jaki poziom szczegółowości jest oczekiwany?"

Przykłady ZŁYCH pytań (zbyt ogólne):
- "Jak chcesz to zrobić?" ❌
- "Co jest najważniejsze?" ❌

Zwróć JSON: 
{
  "questions": ["Konkretne pytanie 1? ", "Konkretne pytanie 2?", "Konkretne pytanie 3?"]
}`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:  JSON.stringify({
          messages: [
            { role: 'system', content: 'Jesteś asystentem ADHD specjalizującym się w konkretnych pytaniach doprecyzowujących.' },
            { role: 'user', content: prompt }
          ],
          jsonMode: true
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate questions')
      
      const data = await res.json()
      const parsed = JSON.parse(data.response || '{"questions":[]}')
      
      if (parsed.questions && parsed.questions.length > 0) {
        setClarifyQuestions(parsed.questions)
        setCurrentQuestion(0)
        setAnswers([])
      } else {
        throw new Error('No questions generated')
      }
    } catch (err) {
      console.error('Error generating questions:', err)
      // Fallback questions
      setClarifyQuestions([
        'Jakie są najważniejsze elementy tego zadania?',
        'Czy są jakieś konkretne wymagania lub ograniczenia? ',
        'W jakiej kolejności najlepiej to zrobić?'
      ])
    } finally {
      setIsLoadingQuestions(false)
    }
  }
  
  // Answer Question
  const handleAnswerQuestion = (answer: string) => {
    if (! answer.trim()) return
    
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)
    
    if (currentQuestion < clarifyQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Last question answered - generate subtasks
      generateSubtasksFromQuestions(newAnswers)
    }
  }
  
  // Generate Subtasks from Questions
  const generateSubtasksFromQuestions = async (allAnswers: string[]) => {
    setIsLoadingQuestions(true)
    
    try {
      const qaContext = clarifyQuestions
        .map((q, i) => `Q:  ${q}\nA: ${allAnswers[i]}`)
        .join('\n\n')

      const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD.

Zadanie: "${task.content}"
${task.description ? `Opis: "${task.description}"` : ''}

Twoje zrozumienie:  ${aiSummary}

Odpowiedzi użytkownika: 
${qaContext}

Na podstawie tych informacji wygeneruj: 

1. **4-7 konkretnych subtasków** (kroków do wykonania)
2. **Całkowitą estymację** czasu (suma subtasków)
3. **Najlepszy dzień tygodnia** (0=niedziela... 6=sobota)
4. **Najlepsza pora dnia** (morning/afternoon/evening)
5. **Uzasadnienie schedulingu** (1-2 zdania)
6. **2-3 praktyczne tipy**

Zwróć JSON:
{
  "subtasks": [
    {"title": "Krok 1", "description": "Dokładny opis", "estimatedMinutes": 30}
  ],
  "totalEstimation": 120,
  "bestDayOfWeek": 2,
  "bestTimeOfDay": "morning",
  "schedulingReasoning": ".. .",
  "tips": ["Tip 1", "Tip 2"]
}`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Jesteś asystentem ADHD specjalizującym się w dekompozycji zadań.' },
            { role: 'user', content: prompt }
          ],
          jsonMode:  true
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate subtasks')
      
      const data = await res.json()
      const parsed = JSON.parse(data.response || '{}')
      
      if (parsed.subtasks && parsed.subtasks.length > 0) {
        const generatedSubtasks:  Subtask[] = parsed.subtasks.map((st:  any, idx: number) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: st.title,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes || 30,
          selected: true
        }))
        
        setSubtasks(generatedSubtasks)
        setTotalEstimation(parsed.totalEstimation)
        setBestDayOfWeek(parsed.bestDayOfWeek)
        setBestTimeOfDay(parsed. bestTimeOfDay)
        setSchedulingReasoning(parsed. schedulingReasoning || '')
        setTips(parsed.tips || [])
        setViewMode('subtasks')
      }
    } catch (err) {
      console.error('Error generating subtasks:', err)
      alert('Nie udało się wygenerować subtasków.  Spróbuj ponownie.')
    } finally {
      setIsLoadingQuestions(false)
    }
  }
  
  // Chat Mode
  const handleStartChat = () => {
    setViewMode('chat')
    const welcomeMsg:  Message = {
      role: 'assistant',
      content: `Rozmawiajmy o zadaniu:  **${task.content}**\n\n${aiSummary}\n\nO czym chcesz porozmawiać?  Możesz zapytać o szczegóły, podzielić się swoimi pomysłami, lub zasięgnąć rady jak do tego podejść. `,
      timestamp: new Date().toISOString()
    }
    setMessages([welcomeMsg])
  }
  
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isLoadingChat) return
    
    const userMsg: Message = {
      role:  'user',
      content:  chatInput,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMsg])
    const currentInput = chatInput
    setChatInput('')
    setIsLoadingChat(true)
    
    try {
      const conversationHistory = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n')

      const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD.

Zadanie: "${task.content}"
${task.description ? `Opis: "${task.description}"` : ''}

Twoje zrozumienie:  ${aiSummary}

Historia rozmowy:
${conversationHistory}

Nowa wiadomość:  "${currentInput}"

Prowadź naturalną rozmowę o tym zadaniu. Możesz: 
- Odpowiadać na pytania
- Sugerować różne podejścia
- Dopytywać o szczegóły
- Doradzać jak podejść do zadania

Bądź konkretny, wspierający i naturalny.  Odpowiedz w 2-4 zdaniach.`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type':  'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Jesteś wspierającym asystentem ADHD.' },
            { role: 'user', content: prompt }
          ]
        })
      })
      
      if (!res.ok) throw new Error('Failed to send message')
      
      const data = await res.json()
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || 'Rozumiem.  Jak mogę jeszcze pomóc?',
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [... prev, assistantMsg])
    } catch (err) {
      console.error('Error in chat:', err)
    } finally {
      setIsLoadingChat(false)
    }
  }
  
  // Generate Directly (skip questions/chat)
  const handleGenerateDirectly = async () => {
    setIsLoadingQuestions(true)
    setViewMode('subtasks')
    
    try {
      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:  JSON.stringify({
          taskContent: task.content,
          taskDescription: task.description
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate')
      
      const data = await res.json()
      
      if (data.steps && data.steps.length > 0) {
        const generatedSubtasks: Subtask[] = data.steps.map((st: any, idx: number) => ({
          id: `subtask-${Date.now()}-${idx}`,
          title: st.title,
          description: st.description,
          estimatedMinutes: st.estimatedMinutes || 30,
          selected: true
        }))
        
        setSubtasks(generatedSubtasks)
        setTotalEstimation(data.totalEstimation)
        setBestDayOfWeek(data.bestDayOfWeek)
        setBestTimeOfDay(data.bestTimeOfDay)
        setSchedulingReasoning(data.schedulingReasoning || '')
        setTips(data.tips || [])
      }
    } catch (err) {
      console.error('Error generating:', err)
    } finally {
      setIsLoadingQuestions(false)
    }
  }
  
  // Toggle Subtask Selection
  const toggleSubtask = (id: string, selected: boolean) => {
    setSubtasks(prev => prev.map(st => 
      st.id === id ? { ...st, selected } : st
    ))
  }
  
  // Create Subtasks in Todoist
  const handleCreateSubtasks = async () => {
    const selectedSubtasks = subtasks.filter(st => st.selected)
    
    if (selectedSubtasks.length === 0) {
      alert('Wybierz przynajmniej jeden subtask')
      return
    }
    
    setIsCreatingSubtasks(true)
    
    try {
      const todoistSubtasks = selectedSubtasks. map(st => ({
        content: st. title,
        description: st. description,
        duration: st.estimatedMinutes,
        duration_unit: 'minute' as const
      }))
      
      await onCreateSubtasks(todoistSubtasks)
      onClose()
    } catch (err) {
      console.error('Error creating subtasks:', err)
      alert('Nie udało się utworzyć subtasków')
    } finally {
      setIsCreatingSubtasks(false)
    }
  }
  
  const selectedSubtasksCount = subtasks.filter(st => st.selected).length
  
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity:  1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b bg-gradient-to-r from-purple-50 to-pink-50 shrink-0">
              <div className="flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="shrink-0"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Lightning size={24} weight="duotone" className="text-purple-600" />
                  </div>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    🤖 AI Assistant:  {task.content}
                  </h2>
                  {task.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 w-8 h-8 rounded-lg hover:bg-gray-200 transition flex items-center justify-center"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* INIT VIEW - AI Summary + Options */}
              {viewMode === 'init' && (
                <div className="p-6 space-y-6">
                  {/* AI Summary Card */}
                  {isLoadingSummary ? (
                    <div className="p-6 border border-purple-200 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Robot size={32} className="text-purple-600" weight="duotone" />
                        </motion.div>
                        <div>
                          <h3 className="font-semibold">Analizuję zadanie... </h3>
                          <p className="text-sm text-gray-600">Przygotowuję plan działania</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="p-6 border border-purple-200 rounded-xl bg-gradient-to-br from-purple-50/50 to-pink-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <Brain size={20} className="text-purple-600" weight="duotone" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2 text-purple-900">
                              Jak rozumiem to zadanie: 
                            </h3>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {aiSummary}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Action Buttons */}
                  {! isLoadingSummary && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="grid grid-cols-1 md: grid-cols-3 gap-3"
                    >
                      <button
                        onClick={handleStartQuestions}
                        disabled={isLoadingQuestions}
                        className="group h-auto py-5 px-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Question size={24} className="text-purple-600 group-hover:scale-110 transition" weight="duotone" />
                          <span className="font-semibold text-gray-900">Zadaj pytania</span>
                        </div>
                        <span className="text-xs text-gray-600 block">
                          AI zada 3-4 pytania o szczegóły zadania
                        </span>
                      </button>
                      
                      <button
                        onClick={handleStartChat}
                        className="group h-auto py-5 px-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <ChatCircle size={24} className="text-blue-600 group-hover:scale-110 transition" weight="duotone" />
                          <span className="font-semibold text-gray-900">Rozmawiaj z AI</span>
                        </div>
                        <span className="text-xs text-gray-600 block">
                          Naturalny dialog o zadaniu
                        </span>
                      </button>
                      
                      <button
                        onClick={handleGenerateDirectly}
                        disabled={isLoadingQuestions}
                        className="group h-auto py-5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all text-left text-white shadow-lg"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Lightning size={24} className="group-hover:scale-110 transition" weight="fill" />
                          <span className="font-semibold">Generuj od razu</span>
                        </div>
                        <span className="text-xs text-white/90 block">
                          Stwórz plan bez pytań
                        </span>
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
              
              {/* QUESTIONS VIEW */}
              {viewMode === 'questions' && (
                <div className="p-6 space-y-4">
                  {isLoadingQuestions && clarifyQuestions.length === 0 ?  (
                    <div className="flex flex-col items-center justify-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4"
                      >
                        <Sparkle size={32} className="text-purple-600" weight="duotone" />
                      </motion.div>
                      <h3 className="font-semibold text-lg">Przygotowuję pytania... </h3>
                      <p className="text-sm text-gray-600">AI analizuje zadanie</p>
                    </div>
                  ) : (
                    <>
                      {/* Progress */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-lg">Doprecyzowanie zadania</h3>
                          <div className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-sm font-medium">
                            {currentQuestion + 1} / {clarifyQuestions.length}
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentQuestion + 1) / clarifyQuestions.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                      
                      {/* Questions */}
                      <div className="space-y-3">
                        {clarifyQuestions.map((question, idx) => {
                          const isAnswered = !!answers[idx]
                          const isCurrent = idx === currentQuestion && !isAnswered
                          
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity:  0, x: -20 }}
                              animate={{ opacity:  1, x: 0 }}
                              transition={{ delay:  idx * 0.1 }}
                            >
                              {isAnswered ? (
                                // Answered Question
                                <div className="bg-green-50/50 border-2 border-green-200 rounded-xl overflow-hidden">
                                  <button
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition text-left"
                                    onClick={() => {
                                      // Could implement edit functionality
                                    }}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                      <Check size={16} className="text-green-600" weight="bold" />
                                    </div>
                                    <p className="flex-1 font-medium text-gray-900">{question}</p>
                                  </button>
                                  <div className="px-4 pb-3 pl-15">
                                    <div className="bg-white p-3 rounded-lg border border-green-200">
                                      <p className="text-sm text-gray-700">{answers[idx]}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : isCurrent ? (
                                // Current Question
                                <div className="border-2 border-purple-500 rounded-xl p-4 bg-white shadow-lg">
                                  <div className="flex items-start gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                      <span className="text-sm font-bold text-purple-600">{idx + 1}</span>
                                    </div>
                                    <p className="flex-1 font-medium text-gray-900 pt-1">{question}</p>
                                  </div>
                                  
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-3"
                                  >
                                    <textarea
                                      id={`answer-${idx}`}
                                      placeholder="Twoja odpowiedź..."
                                      className="w-full min-h-[100px] px-4 py-3 border-2 border-gray-200 rounded-lg focus: outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          const textarea = document.getElementById(`answer-${idx}`) as HTMLTextAreaElement
                                          handleAnswerQuestion(textarea?. value || '')
                                        }}
                                        disabled={isLoadingQuestions}
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                                      >
                                        {isLoadingQuestions ? (
                                          <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease:  "linear" }}
                                          >
                                            <Sparkle size={16} />
                                          </motion.div>
                                        ) : idx === clarifyQuestions.length - 1 ? (
                                          <>
                                            <Sparkle size={16} />
                                            Wygeneruj plan
                                          </>
                                        ) : (
                                          <>
                                            Następne pytanie
                                            <ArrowRight size={16} />
                                          </>
                                        )}
                                      </button>
                                      {idx < clarifyQuestions.length - 1 && (
                                        <button
                                          onClick={() => {
                                            const textarea = document.getElementById(`answer-${idx}`) as HTMLTextAreaElement
                                            handleAnswerQuestion(textarea?.value || 'Pomiń')
                                          }}
                                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                        >
                                          Pomiń
                                        </button>
                                      )}
                                    </div>
                                  </motion.div>
                                </div>
                              ) : (
                                // Future Question
                                <div className="border-2 border-gray-200 rounded-xl p-4 opacity-50">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                      <span className="text-sm font-bold text-gray-400">{idx + 1}</span>
                                    </div>
                                    <p className="flex-1 text-gray-600 pt-1">{question}</p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                      
                      {/* Back Button */}
                      <div className="pt-4">
                        <button
                          onClick={() => setViewMode('init')}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                        >
                          <ArrowLeft size={16} />
                          Wróć do wyboru
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* CHAT VIEW */}
              {viewMode === 'chat' && (
                <div className="flex flex-col h-[500px]">
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <ChatCircle size={20} className="text-white" weight="duotone" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Rozmowa o zadaniu</h3>
                          <p className="text-xs text-gray-600">Zadaj pytanie lub podziel się pomysłem</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewMode('init')}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                      >
                        <ArrowLeft size={16} />
                        Wróć
                      </button>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity:  0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Robot size={16} className="text-white" weight="duotone" />
                          </div>
                        )}
                        
                        <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 rounded-xl ${
                            msg.role === 'user' 
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <div className="text-sm whitespace-pre-wrap">
                              {msg.content. split('**').map((part, i) => 
                                i % 2 === 0 ?  part : <strong key={i}>{part}</strong>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                            <User size={16} className="text-white" weight="duotone" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {isLoadingChat && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity:  1 }}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Robot size={16} className="text-white" />
                        </div>
                        <div className="bg-gray-100 p-3 rounded-xl">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-purple-600"
                                animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Input */}
                  <div className="px-6 py-4 border-t bg-gray-50 shrink-0">
                    {messages.length > 2 && (
                      <div className="mb-3">
                        <button
                          onClick={handleGenerateDirectly}
                          disabled={isLoadingQuestions}
                          className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg hover:bg-purple-50 transition text-sm font-medium text-purple-900 flex items-center justify-center gap-2"
                        >
                          <ListChecks size={16} />
                          Wygeneruj plan na podstawie rozmowy
                        </button>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Napisz wiadomość..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendChatMessage()
                          }
                        }}
                        disabled={isLoadingChat}
                        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendChatMessage}
                        disabled={isLoadingChat || !chatInput.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 flex items-center justify-center"
                      >
                        <PaperPlaneRight size={18} weight="fill" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* SUBTASKS VIEW */}
              {viewMode === 'subtasks' && (
                <div className="p-6 space-y-5">
                  {isLoadingQuestions ?  (
                    <div className="flex flex-col items-center justify-center py-16">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6"
                      >
                        <Sparkle size={40} className="text-purple-600" weight="duotone" />
                      </motion.div>
                      <h3 className="font-semibold text-lg mb-2">Przygotowuję twój plan... </h3>
                      <p className="text-sm text-gray-600">AI analizuje zadanie i tworzy szczegółowy plan działania</p>
                      <div className="flex gap-2 mt-6">
                        {[0, 1, 2]. map(i => (
                          <motion.div
                            key={i}
                            className="w-3 h-3 rounded-full bg-purple-600"
                            animate={{ 
                              scale: [1, 1.3, 1],
                              opacity: [0.5, 1, 0.5] 
                            }}
                            transition={{
                              duration: 1.5,
                              repeat:  Infinity,
                              delay: i * 0.2
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Scheduling Card - PROMINENT */}
                      {(bestDayOfWeek !== undefined || bestTimeOfDay || schedulingReasoning) && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="border-2 border-purple-300 rounded-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 shadow-xl overflow-hidden">
                            <div className="p-5 space-y-4">
                              {/* Header */}
                              <div className="flex items-center gap-3">
                                <motion.div
                                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0"
                                  animate={{ 
                                    boxShadow: [
                                      '0 0 0 0 rgba(168, 85, 247, 0.7)',
                                      '0 0 0 20px rgba(168, 85, 247, 0)',
                                    ]
                                  }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <Sparkle size={24} className="text-white" weight="fill" />
                                </motion. div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg text-purple-900">
                                    🎯 Optymalna pora na to zadanie
                                  </h4>
                                  <p className="text-xs text-purple-700">
                                    Zaplanowane przez AI dla maksymalnej produktywności
                                  </p>
                                </div>
                              </div>
                              
                              {/* Badges */}
                              <div className="flex flex-wrap gap-2">
                                {bestDayOfWeek !== undefined && (
                                  <div className="px-4 py-2 bg-purple-100 text-purple-900 rounded-lg font-medium text-sm border-2 border-purple-200">
                                    📅 {['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][bestDayOfWeek]}
                                  </div>
                                )}
                                {bestTimeOfDay && (
                                  <div className="px-4 py-2 bg-pink-100 text-pink-900 rounded-lg font-medium text-sm border-2 border-pink-200">
                                    {bestTimeOfDay === 'morning' ? '🌅 Rano (8-12)' :
                                     bestTimeOfDay === 'afternoon' ? '☀️ Popołudnie (12-17)' :
                                     '🌙 Wieczór (17-22)'}
                                  </div>
                                )}
                              </div>
                              
                              {/* Reasoning */}
                              {schedulingReasoning && (
                                <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border-2 border-purple-200">
                                  <p className="text-sm text-gray-800 leading-relaxed">
                                    <span className="font-semibold text-purple-900">💡 Dlaczego: </span>{' '}
                                    {schedulingReasoning}
                                  </p>
                                </div>
                              )}
                              
                              {/* Quick Schedule Button */}
                              <button
                                onClick={() => {
                                  alert('Auto-scheduling będzie wkrótce dostępne!')
                                }}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
                              >
                                <CalendarPlus size={20} weight="bold" />
                                Zaplanuj automatycznie na {bestDayOfWeek !== undefined ? ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'][bestDayOfWeek] : 'wybrany dzień'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* AI Tips */}
                      {tips && tips.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <div className="border-2 border-blue-200 rounded-xl bg-blue-50/50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb size={20} className="text-blue-600" weight="duotone" />
                              <h4 className="font-semibold text-blue-900">Porady AI</h4>
                            </div>
                            <ul className="space-y-2">
                              {tips.map((tip, idx) => (
                                <motion.li
                                  key={idx}
                                  initial={{ opacity: 0, x:  -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-start gap-2 text-sm text-gray-700"
                                >
                                  <span className="text-blue-600 font-bold shrink-0 mt-0.5">✓</span>
                                  <span className="leading-relaxed">{tip}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Subtasks Header */}
                      <div className="flex items-center justify-between pt-2">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <ListChecks size={24} className="text-purple-600" weight="duotone" />
                          Plan działania ({subtasks.length} {subtasks.length === 1 ? 'krok' : 'kroków'})
                        </h3>
                        {totalEstimation && (
                          <div className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium flex items-center gap-1">
                            <Clock size={14} />
                            Łącznie:  ~{Math.floor(totalEstimation / 60)}h {totalEstimation % 60}min
                          </div>
                        )}
                      </div>
                      
                      {/* Subtasks List */}
                      <div className="space-y-3">
                        {subtasks.map((subtask, idx) => (
                          <motion.div
                            key={subtask.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <div className={`border-2 rounded-xl p-4 transition-all ${
                              subtask.selected 
                                ? 'border-purple-300 bg-white shadow-md border-l-[6px] border-l-purple-500' 
                                : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}>
                              <div className="flex items-start gap-3">
                                {/* Step Number */}
                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                                  subtask.selected
                                    ? 'bg-gradient-to-br from-purple-100 to-pink-100'
                                    : 'bg-gray-200'
                                }`}>
                                  <span className={`text-sm font-bold ${
                                    subtask. selected ?  'text-purple-700' : 'text-gray-500'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 space-y-2 min-w-0">
                                  <h4 className={`font-semibold ${
                                    subtask.selected ?  'text-gray-900' : 'text-gray-600'
                                  }`}>
                                    {subtask. title}
                                  </h4>
                                  <p className={`text-sm leading-relaxed ${
                                    subtask.selected ? 'text-gray-600' : 'text-gray-500'
                                  }`}>
                                    {subtask.description}
                                  </p>
                                  
                                  {/* Meta */}
                                  {subtask.estimatedMinutes && (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                                      <Clock size={12} />
                                      ~{subtask.estimatedMinutes}min
                                    </div>
                                  )}
                                </div>
                                
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleSubtask(subtask.id, ! subtask.selected)}
                                  className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                                    subtask.selected
                                      ? 'bg-purple-600 border-purple-600'
                                      : 'bg-white border-gray-300 hover:border-purple-400'
                                  }`}
                                >
                                  {subtask.selected && (
                                    <Check size={16} className="text-white" weight="bold" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={onClose}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium text-gray-700 flex items-center justify-center gap-2"
                        >
                          <X size={18} />
                          Anuluj
                        </button>
                        <button
                          onClick={handleCreateSubtasks}
                          disabled={selectedSubtasksCount === 0 || isCreatingSubtasks}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover: from-purple-700 hover: to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg flex items-center justify-center gap-2"
                        >
                          {isCreatingSubtasks ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Sparkle size={18} />
                              </motion.div>
                              Tworzę... 
                            </>
                          ) : (
                            <>
                              <Check size={18} weight="bold" />
                              Utwórz {selectedSubtasksCount} {selectedSubtasksCount === 1 ? 'podzadanie' : 'podzadań'}
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Back to Options */}
                      <div className="pt-2 text-center">
                        <button
                          onClick={() => setViewMode('init')}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 mx-auto"
                        >
                          <ArrowLeft size={16} />
                          Wróć do wyboru opcji
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
