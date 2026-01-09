'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Card from '@/components/ui/Card'
import { Sparkle, ArrowLeft, Warning, CheckCircle, Info } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'

interface Insight {
  type: 'info' | 'warning' | 'success'
  title: string
  description: string
  details: Record<string, any>
}

interface Stats {
  journal_entries_count: number
  completed_tasks_count: number
  postponements_count: number
  days_with_plan: number
  avg_energy: number
  avg_motivation: number
  avg_sleep_quality: number
  avg_hours_slept: number
  tasks_added_last_7_days: number
  tasks_completed_last_7_days: number
}

export default function AIInsightsPage() {
  const router = useRouter()
  const [insights, setInsights] = useState<Insight[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
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

        const data = await response.json()
        setInsights(data.insights || [])
        setStats(data.stats)
      } catch (err: any) {
        console.error('Failed to fetch insights:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [router])

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <Warning size={20} weight="fill" className="text-orange-600" />
      case 'success':
        return <CheckCircle size={20} weight="fill" className="text-green-600" />
      default:
        return <Info size={20} weight="fill" className="text-blue-600" />
    }
  }

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-50 border-orange-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
      <p className="text-gray-600 text-lg mb-8">
        Personalne obserwacje bazujące na Twoich rzeczywistych danych
      </p>

      {/* Info Card */}
      <Card className="mb-6 bg-purple-50 border-purple-200">
        <div className="p-6">
          <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Sparkle size={20} weight="fill" />
            Czym są AI Insights?
          </h3>
          <p className="text-purple-800 text-sm">
            AI analizuje Twoje dane z dziennika, zadań i wzorców pracy z ostatnich 30 dni, 
            aby znaleźć korelacje i wzorce, które pomogą Ci lepiej zarządzać czasem i energią.
          </p>
          
          {stats && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700">{stats.journal_entries_count}</div>
                <div className="text-xs text-purple-600">Wpisy dziennika</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700">{stats.completed_tasks_count}</div>
                <div className="text-xs text-purple-600">Ukończonych zadań</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700">{stats.postponements_count}</div>
                <div className="text-xs text-purple-600">Przełożeń</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700">{stats.days_with_plan}</div>
                <div className="text-xs text-purple-600">Dni z planem</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Insights */}
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="p-4 text-red-800">{error}</div>
        </Card>
      )}

      {insights.length === 0 && !error && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Brak wystarczających danych do wygenerowania insightów. Wypełnij dziennik i ukończ kilka zadań.</p>
        </Card>
      )}

      <div className="space-y-4 mb-8">
        {insights.map((insight, index) => (
          <Card key={index} className={`border ${getBgColor(insight.type)}`}>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">{getIcon(insight.type)}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
                  <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                  {insight.details && Object.keys(insight.details).length > 0 && (
                    <div className="text-xs text-gray-600 bg-white bg-opacity-50 rounded px-3 py-2">
                      <div className="font-mono">Szczegóły:</div>
                      {Object.entries(insight.details).map(([key, value]) => (
                        <div key={key} className="font-mono">
                          {key}: <span className="font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {stats && (
        <Card>
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📊 Podsumowanie ostatnich 30 dni
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-700">
                  {stats.avg_hours_slept.toFixed(1)}h
                </div>
                <div className="text-sm text-blue-600 mt-1">Średni sen</div>
                <div className="text-xs text-blue-500">jakość {stats.avg_sleep_quality.toFixed(1)}/10</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-700">
                  {stats.avg_energy.toFixed(1)}/10
                </div>
                <div className="text-sm text-green-600 mt-1">Średnia energia</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-700">
                  {stats.avg_motivation.toFixed(1)}/10
                </div>
                <div className="text-sm text-purple-600 mt-1">Średnia motywacja</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-700">
                  {stats.tasks_added_last_7_days > 0 
                    ? Math.round((stats.tasks_completed_last_7_days / stats.tasks_added_last_7_days) * 100) 
                    : 0}%
                </div>
                <div className="text-sm text-orange-600 mt-1">Wskaźnik realizacji</div>
                <div className="text-xs text-orange-500">
                  {stats.tasks_completed_last_7_days}/{stats.tasks_added_last_7_days} zadań (7 dni)
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
