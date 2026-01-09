'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Card from '@/components/ui/Card'
import { Sparkle, ArrowLeft, Warning, CheckCircle, Info } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AIInsight {
  type: 'warning' | 'success' | 'info'
  title: string
  description: string
  data?: Record<string, any>
}

interface InsightsResponse {
  insights: AIInsight[]
  stats: {
    avgSleepHours: number
    avgEnergy: number
    avgMotivation: number
    avgSleepQuality: number
    completionRate: number
    tasksAddedLast7Days: number
    tasksCompletedLast7Days: number
  }
  dataAvailable: {
    journalEntries: number
    completedTasks: number
    postpones: number
    dayPlans: number
  }
}

export default function AIInsightsPage() {
  const router = useRouter()
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [stats, setStats] = useState<InsightsResponse['stats'] | null>(null)
  const [dataAvailable, setDataAvailable] = useState<InsightsResponse['dataAvailable'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const response = await fetch('/api/day-assistant-v2/insights', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch insights')
        }

        const data: InsightsResponse = await response.json()
        setInsights(data.insights || [])
        setStats(data.stats)
        setDataAvailable(data.dataAvailable)
      } catch (err: any) {
        console.error('Failed to fetch insights:', err)
        setError(err.message || 'Nie udało się wygenerować insightów')
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [router])

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning':
        return <Warning size={24} weight="fill" className="text-orange-600" />
      case 'success':
        return <CheckCircle size={24} weight="fill" className="text-green-600" />
      case 'info':
        return <Info size={24} weight="fill" className="text-blue-600" />
    }
  }

  const getInsightBgColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-50 border-orange-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analizuję Twoje dane...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Powrót
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Sparkle size={32} weight="fill" className="text-brand-purple" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            AI Insights
          </h1>
        </div>
        <p className="text-gray-600 text-lg">
          Personalne obserwacje bazujące na Twoich rzeczywistych danych
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-purple-50 border-purple-200">
        <div className="p-6">
          <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Sparkle size={20} weight="fill" />
            Czym są AI Insights?
          </h3>
          <p className="text-purple-800 text-sm mb-3">
            AI analizuje Twoje dane z dziennika, zadań i wzorców pracy z ostatnich 30 dni, 
            aby znaleźć korelacje i wzorce, które pomogą Ci lepiej zarządzać czasem i energią.
          </p>
          {dataAvailable && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-xl font-bold text-purple-700">{dataAvailable.journalEntries}</div>
                <div className="text-xs text-purple-600">Wpisów dziennika</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-xl font-bold text-purple-700">{dataAvailable.completedTasks}</div>
                <div className="text-xs text-purple-600">Ukończonych zadań</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-xl font-bold text-purple-700">{dataAvailable.postpones}</div>
                <div className="text-xs text-purple-600">Przełożeń</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-xl font-bold text-purple-700">{dataAvailable.dayPlans}</div>
                <div className="text-xs text-purple-600">Dni z planem</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="p-6">
            <h3 className="font-semibold text-red-900 mb-2">Błąd</h3>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Insights */}
      {insights.length === 0 && !error ? (
        <Card>
          <div className="p-12 text-center">
            <Sparkle size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">Brak wystarczających danych</h3>
            <p className="text-gray-500 mb-4">
              Aby wygenerować insighty, potrzebujesz więcej danych w dzienniku i zadaniach.
              <br />
              Prowadź dziennik regularnie przez kilka dni!
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4 mb-6">
          {insights.map((insight, index) => (
            <Card
              key={index}
              className={cn(
                'border-2 transition-all hover:shadow-lg',
                getInsightBgColor(insight.type)
              )}
            >
              <div className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">
                      {insight.title}
                    </h3>
                    <p className="text-gray-700 mb-3">
                      {insight.description}
                    </p>
                    {insight.data && Object.keys(insight.data).length > 0 && (
                      <div className="mt-3 p-3 bg-white/50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Szczegóły:</p>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(insight.data).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="text-gray-600">{key}:</span>{' '}
                              <span className="font-semibold text-gray-900">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <Card>
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📊 Podsumowanie ostatnich 30 dni
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{stats.avgSleepHours}h</div>
                <div className="text-sm text-blue-600">Średni sen</div>
                <div className="text-xs text-blue-500 mt-1">Jakość: {stats.avgSleepQuality}/10</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{stats.avgEnergy}/10</div>
                <div className="text-sm text-green-600">Średnia energia</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{stats.avgMotivation}/10</div>
                <div className="text-sm text-purple-600">Średnia motywacja</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{stats.completionRate}%</div>
                <div className="text-sm text-orange-600">Wskaźnik realizacji</div>
                <div className="text-xs text-orange-500 mt-1">
                  {stats.tasksCompletedLast7Days}/{stats.tasksAddedLast7Days} zadań (7 dni)
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
