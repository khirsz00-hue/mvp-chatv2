'use client'

import { useState, useEffect } from 'react'
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
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

interface Task {
  id: string
  content: string
  description?:  string
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?:  { date: string } | string
}

interface AITaskBreakdownModalProps {
  open: boolean
  onClose: () => void
  task: Task
  onCreateSubtasks: (subtasks: Array<{
    content: string
    description?: string
    duration?: number
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
  
  // Initialize - fetch AI summary
  useEffect(() => {
    if (open && !aiSummary) {
      generateAISummary()
    }
    
    if (! open) {
      resetModal()
    }
  }, [open])
  
  const resetModal = () => {
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
  }
  
  // AI Summary Generation
  const generateAISummary = async () => {
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
            { role: 'system', content:  'Jesteś wspierającym asystentem ADHD.' },
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
  }
  
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
        body: JSON.stringify({
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
        'Czy są jakieś konkretne wymagania lub ograniczenia?',
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
        body:  JSON.stringify({
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
      alert('Nie udało się wygenerować subtasków. Spróbuj ponownie.')
    } finally {
      setIsLoadingQuestions(false)
    }
  }
  
  // Chat Mode
  const handleStartChat = () => {
    setViewMode('chat')
    const welcomeMsg:  Message = {
      role: 'assistant',
      content: `Rozmawiajmy o zadaniu: **${task.content}**\n\n${aiSummary}\n\nO czym chcesz porozmawiać? Możesz zapytać o szczegóły, podzielić się swoimi pomysłami, lub zasięgnąć rady jak do tego podejść.`,
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

Bądź konkretny, wspierający i naturalny. Odpowiedz w 2-4 zdaniach.`

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
      const prompt = `Jesteś asystentem AI wspierającym osoby z ADHD. 

Zadanie: "${task. content}"
${task.description ?  `Opis: "${task.description}"` : ''}

Twoje zrozumienie: ${aiSummary}

Wygeneruj plan działania z 4-7 subtaskami, estymacją czasu, schedulingiem i tipami. 

Zwróć JSON jak wcześniej. `

      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          selected:  true
        }))
        
        setSubtasks(generatedSubtasks)
        setTotalEstimation(data.totalEstimation)
        setBestDayOfWeek(data. bestDayOfWeek)
        setBestTimeOfDay(data.bestTimeOfDay)
        setSchedulingReasoning(data.schedulingReasoning || '')
        setTips(data. tips || [])
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
    const selectedSubtasks = subtasks.filter(st => st. selected)
    
    if (selectedSubtasks.length === 0) {
      alert('Wybierz przynajmniej jeden subtask')
      return
    }
    
    setIsCreatingSubtasks(true)
    
    try {
      const todoist Subtasks = selectedSubtasks.map(st => ({
        content: st.title,
        description: st.description,
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
  
  if (! open) return null
