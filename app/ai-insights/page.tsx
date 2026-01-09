'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AIInsightsPanel } from '@/components/assistant/AIInsightsPanel'
import Card from '@/components/ui/Card'
import { Sparkle, ArrowLeft } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'

interface Task {
  id: string
  content: string
  priority: 1 | 2 | 3 | 4
  due?: string
  completed?: boolean
  completed_at?: string
}

export default function AIInsightsPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch active tasks
        const { data: activeTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('created_at', { ascending: false })
          .limit(50)

        // Fetch recently completed tasks
        const { data: completed } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('completed_at', { ascending: false })
          .limit(20)

        setTasks(activeTasks || [])
        setCompletedTasks(completed || [])
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Powrót
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Sparkle size={32} weight="fill" className="text-brand-purple" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            AI Insights
          </h1>
        </div>
        <p className="text-gray-600 text-lg">
          Inteligentne obserwacje i wzorce wykryte w Twoich zadaniach
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Jak działają AI Insights?</h2>
            <p className="text-gray-600">
              AI analizuje Twoje zadania, wzorce pracy i produktywność, aby dostarczyć 
              wartościowe obserwacje. To pasywne sugestie - nie musisz na nie reagować, 
              ale mogą pomóc w lepszym zarządzaniu czasem.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="font-semibold text-orange-900 mb-1">⚠️ Ostrzeżenia</div>
              <div className="text-orange-700">Przeciążenie, ryzyko wypalenia</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="font-semibold text-green-900 mb-1">✅ Sukcesy</div>
              <div className="text-green-700">Pozytywne wzorce, osiągnięcia</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-semibold text-blue-900 mb-1">💡 Sugestie</div>
              <div className="text-blue-700">Optymalizacje, pomysły</div>
            </div>
          </div>
        </Card>

        {/* AI Insights Panel */}
        <AIInsightsPanel
          tasks={tasks}
          completedTasks={completedTasks}
          className="shadow-lg"
        />

        {/* Stats Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Podsumowanie</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-purple">{tasks.length}</div>
              <div className="text-sm text-gray-600">Aktywne zadania</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{completedTasks.length}</div>
              <div className="text-sm text-gray-600">Ukończone (ostatnio)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {tasks.filter(t => t.priority === 1).length}
              </div>
              <div className="text-sm text-gray-600">Priorytet 1</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {tasks.filter(t => t.due).length}
              </div>
              <div className="text-sm text-gray-600">Z deadline</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
