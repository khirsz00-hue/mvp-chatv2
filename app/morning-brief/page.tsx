'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { SunHorizon, ArrowLeft, ArrowsClockwise, Target, Eye, EyeSlash } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useMorningBrief } from './hooks/useMorningBrief'
import RecapCard from './components/RecapCard'
import QuickStats from './components/QuickStats'
import TTSPlayer from './components/TTSPlayer'

export default function MorningBriefPage() {
  const router = useRouter()
  const [todoistToken, setTodoistToken] = useState<string | null>(null)
  const [showYesterday, setShowYesterday] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)

  const { data, loading, error, refresh } = useMorningBrief(todoistToken)

  // Check authentication and get Todoist token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // Get Todoist token from localStorage
        const token = localStorage.getItem('todoist_token')
        if (!token) {
          console.warn('⚠️ No Todoist token found')
        }
        setTodoistToken(token)
      } catch (error) {
        console.error('❌ Error checking auth:', error)
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Powrót
        </Button>
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">
            {error || 'Nie udało się załadować danych'}
          </p>
          {!todoistToken && (
            <p className="text-gray-600 mb-4">
              Musisz połączyć konto Todoist, aby korzystać z Porannego Briefu
            </p>
          )}
          <Button onClick={refresh}>Spróbuj ponownie</Button>
        </Card>
      </div>
    )
  }

  const statsData = {
    yesterdayCompleted: data.yesterday.stats.completed,
    yesterdayTotal: data.yesterday.stats.total,
    todayTotal: data.today.stats.total,
    todayHighPriority: data.today.stats.highPriority
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
        
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <SunHorizon size={40} weight="fill" className="text-amber-500" />
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Poranny Brief
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Twoje codzienne podsumowanie
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            onClick={refresh}
            className="flex items-center gap-2"
            title="Odśwież dane"
          >
            <ArrowsClockwise size={20} />
            Odśwież
          </Button>
        </div>

        {/* TTS Player */}
        <div className="mb-6">
          <TTSPlayer text={data.summary} />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={showYesterday ? 'outline' : 'default'}
            onClick={() => setShowYesterday(!showYesterday)}
            className="flex items-center gap-2"
          >
            {showYesterday ? <EyeSlash size={20} /> : <Eye size={20} />}
            {showYesterday ? 'Ukryj wczoraj' : 'Pokaż wczoraj'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowYesterday(false)}
            className="flex items-center gap-2"
          >
            <Target size={20} weight="fill" />
            Tylko dzisiaj
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Statistics */}
        <QuickStats stats={statsData} />

        {/* Focus Task Highlight */}
        {data.today.focusTask && (
          <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-start gap-4">
              <Target size={32} weight="fill" className="text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-2">
                  Sugerowane zadanie focus
                </h3>
                <p className="text-amber-800 font-medium text-xl">
                  {data.today.focusTask.content}
                </p>
                {data.today.focusTask.due?.date && (
                  <p className="text-sm text-amber-700 mt-2">
                    Termin: {data.today.focusTask.due.date}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Yesterday Section */}
        {showYesterday && (
          <RecapCard
            title="Wczoraj"
            subtitle={
              data.yesterday.lastActiveTask 
                ? `Ostatnio pracowałeś nad: ${data.yesterday.lastActiveTask.content}`
                : undefined
            }
            tasks={data.yesterday.tasks.slice(0, 10)} // Show max 10 tasks
            icon="yesterday"
          />
        )}

        {/* Today Section */}
        <RecapCard
          title="Dzisiaj"
          subtitle={`${data.today.stats.total} ${
            data.today.stats.total === 1 ? 'zadanie' : 
            data.today.stats.total < 5 ? 'zadania' : 'zadań'
          } do zrobienia`}
          tasks={data.today.tasks}
          icon="today"
          meetings={data.meetings}
        />

        {/* Personalized Tips for ADHD */}
        {data.tips && data.tips.length > 0 && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              💡 Wskazówki na dziś
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              {data.tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}
