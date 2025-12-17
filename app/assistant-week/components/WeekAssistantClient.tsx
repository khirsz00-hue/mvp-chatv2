'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CheckCircle, Lightning, ArrowClockwise, XCircle } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { applyRecommendation, rejectRecommendation, runWeekAnalysis } from '../actions'
import { WeekDaySummary, WeekRecommendation, WeekSnapshot } from '../types'

interface Props {
  initialData: WeekSnapshot
}

function StatusBadge({ status }: { status: WeekDaySummary['status'] }) {
  const map = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    overloaded: 'bg-red-50 text-red-700 border-red-200',
    empty: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  const label = status === 'ok' ? 'OK / stabilny (40–80%)' : status === 'overloaded' ? 'Przeciążony' : 'Pusty'
  return <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${map[status]}`}>{label}</span>
}

function DayCard({ day }: { day: WeekDaySummary }) {
  return (
    <div className="min-w-[220px] rounded-xl border border-gray-200 bg-white/70 shadow-soft p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{day.label}</p>
          <p className="text-lg font-bold">{day.percentage}% obłożenia</p>
        </div>
        <StatusBadge status={day.status} />
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${day.status === 'overloaded' ? 'bg-red-400' : day.status === 'empty' ? 'bg-amber-400' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(100, day.percentage)}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Zadania</p>
          <p className="font-semibold">{day.tasksCount}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Spotkania</p>
          <p className="font-semibold">{day.eventsCount}</p>
        </div>
      </div>
      {day.warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-1">
          {day.warnings.map((w) => (
            <p key={w}>• {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationCard({
  rec,
  onApply,
  onReject,
  disabled,
}: {
  rec: WeekRecommendation
  onApply: () => void
  onReject: () => void
  disabled: boolean
}) {
  const statusStyles = {
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    applied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const statusLabel = rec.status === 'pending' ? 'Do decyzji' : rec.status === 'applied' ? 'Zastosowana' : 'Odrzucona'
  return (
    <div className="rounded-xl border border-gray-200 bg-white/80 shadow-soft p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{rec.title}</p>
          <p className="text-sm text-gray-600 mt-1">{rec.explanation}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border ${statusStyles[rec.status]}`}>{statusLabel}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={onApply}
          disabled={disabled || rec.status !== 'pending'}
          className="flex items-center gap-2"
        >
          <CheckCircle size={16} />
          Zastosuj
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={disabled || rec.status !== 'pending'}
          className="flex items-center gap-2"
        >
          <XCircle size={16} />
          Odrzuć
        </Button>
      </div>
    </div>
  )
}

export function WeekAssistantClient({ initialData }: Props) {
  const [data, setData] = useState<WeekSnapshot>(initialData)
  const [isPending, startTransition] = useTransition()
  const [actioningId, setActioningId] = useState<string | null>(null)
  const { showToast } = useToast()
  const router = useRouter()

  const refreshState = (payload?: WeekSnapshot) => {
    if (payload) {
      setData(payload)
    }
  }

  const handleAnalyze = () => {
    startTransition(async () => {
      const res = await runWeekAnalysis()
      if (res?.error) {
        showToast(res.error, 'error')
        return
      }
      if (res.data) {
        refreshState(res.data)
        showToast('Analiza tygodnia zaktualizowana', 'success')
      }
    })
  }

  const handleApply = (id: string) => {
    setActioningId(id)
    startTransition(async () => {
      const res = await applyRecommendation(id)
      if (res?.error) {
        showToast(res.error, 'error')
      } else if (res.data) {
        refreshState(res.data)
        showToast('Rekomendacja zastosowana', 'success')
      }
      setActioningId(null)
    })
  }

  const handleReject = (id: string) => {
    setActioningId(id)
    startTransition(async () => {
      const res = await rejectRecommendation(id)
      if (res?.error) {
        showToast(res.error, 'error')
      } else if (res.data) {
        refreshState(res.data)
        showToast('Rekomendacja odrzucona', 'success')
      }
      setActioningId(null)
    })
  }

  if (!data.authenticated) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Asystent Tygodnia</CardTitle>
            <CardDescription>Wymaga zalogowania. Zobacz obciążenie tygodnia i sugestie dla ADHD.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => router.push('/login')} className="flex items-center gap-2">
              <Lightning size={16} />
              Zaloguj się
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="flex items-center gap-2">
              <ArrowClockwise size={16} />
              Wróć
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/30 bg-gradient-to-r from-purple-50 to-pink-50 p-6 shadow-glow">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-wide text-purple-600 font-semibold">Asystent Tygodnia</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Czy ten tydzień ma sens dla osoby z ADHD?</h1>
            <p className="text-gray-600 mt-2">
              Widok tygodnia bez godzin. Sprawdza przeciążenia, bufor i kontekst. Rekomendacje mają zawsze przycisk
              „Zastosuj” / „Odrzuć”.
            </p>
          </div>
          <Button onClick={handleAnalyze} disabled={isPending} className="flex items-center gap-2">
            <Lightning size={18} />
            Analiza tygodnia
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-full">
          {data.days.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analiza jakości planu</CardTitle>
          <CardDescription>Patrzymy na rozkład obciążenia, zderzenia zadań i spotkań oraz brak buforów.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-gray-800 leading-relaxed">{data.analysisText}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekomendacje (5–7 konkretnych propozycji)</CardTitle>
          <CardDescription>Każda ma „Zastosuj” / „Odrzuć” i wskazuje konkretny dzień docelowy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recommendations.length === 0 && (
            <p className="text-gray-600 text-sm">
              Brak zapisanych rekomendacji. Uruchom „Analiza tygodnia”, aby wygenerować propozycje.
            </p>
          )}
          {data.recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onApply={() => handleApply(rec.id)}
              onReject={() => handleReject(rec.id)}
              disabled={isPending || actioningId === rec.id}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
