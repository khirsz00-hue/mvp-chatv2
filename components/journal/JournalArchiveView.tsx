'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { buildArchiveHierarchy } from '@/lib/journal'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { JournalEntry, ArchiveHierarchy, JournalStats } from '@/types/journal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft, CaretLeft, CaretRight, ChartLine } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

type ViewLevel = 'years' | 'months' | 'weeks' | 'days'

interface BreadcrumbItem {
  level: ViewLevel
  label: string
  year?: number
  month?: number
  week?: number
}

interface JournalArchiveViewProps {
  onBack: () => void
}

export function JournalArchiveView({ onBack }: JournalArchiveViewProps) {
  const { showToast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [hierarchy, setHierarchy] = useState<ArchiveHierarchy[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { level: 'years', label: 'Lata' },
  ])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  const { allEntries, loading, fetchAllEntries } = useJournalEntries(userId)

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      setIsCheckingAuth(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
      setIsCheckingAuth(false)
    }
    getUser()
  }, [])

  // Fetch all entries
  useEffect(() => {
    if (userId) {
      fetchAllEntries()
    }
  }, [userId, fetchAllEntries])

  // Build hierarchy when entries are loaded
  useEffect(() => {
    if (allEntries.length > 0) {
      const builtHierarchy = buildArchiveHierarchy(allEntries)
      setHierarchy(builtHierarchy)
    }
  }, [allEntries])

  // Navigate to months view
  const navigateToMonths = (year: number) => {
    setSelectedYear(year)
    setSelectedMonth(null)
    setSelectedWeek(null)
    setBreadcrumbs([
      { level: 'years', label: 'Lata' },
      { level: 'months', label: `${year}`, year },
    ])
  }

  // Navigate to weeks view
  const navigateToWeeks = (month: number) => {
    setSelectedMonth(month)
    setSelectedWeek(null)
    const monthNames = [
      'Styczeń',
      'Luty',
      'Marzec',
      'Kwiecień',
      'Maj',
      'Czerwiec',
      'Lipiec',
      'Sierpień',
      'Wrzesień',
      'Październik',
      'Listopad',
      'Grudzień',
    ]
    setBreadcrumbs([
      { level: 'years', label: 'Lata' },
      { level: 'months', label: `${selectedYear}`, year: selectedYear! },
      { level: 'weeks', label: monthNames[month - 1], year: selectedYear!, month },
    ])
  }

  // Navigate to days view
  const navigateToDays = (week: number) => {
    setSelectedWeek(week)
    setBreadcrumbs([
      { level: 'years', label: 'Lata' },
      { level: 'months', label: `${selectedYear}`, year: selectedYear! },
      { level: 'weeks', label: `Miesiąc`, year: selectedYear!, month: selectedMonth! },
      { level: 'days', label: `Tydzień ${week}`, year: selectedYear!, month: selectedMonth!, week },
    ])
  }

  // Navigate back
  const navigateBack = () => {
    if (breadcrumbs.length <= 1) return

    const newBreadcrumbs = breadcrumbs.slice(0, -1)
    const lastBreadcrumb = newBreadcrumbs[newBreadcrumbs.length - 1]

    setBreadcrumbs(newBreadcrumbs)

    if (lastBreadcrumb.level === 'years') {
      setSelectedYear(null)
      setSelectedMonth(null)
      setSelectedWeek(null)
    } else if (lastBreadcrumb.level === 'months') {
      setSelectedYear(lastBreadcrumb.year!)
      setSelectedMonth(null)
      setSelectedWeek(null)
    } else if (lastBreadcrumb.level === 'weeks') {
      setSelectedYear(lastBreadcrumb.year!)
      setSelectedMonth(lastBreadcrumb.month!)
      setSelectedWeek(null)
    }
  }

  // Render stats card
  const renderStats = (stats: JournalStats) => {
    if (stats.totalEntries === 0) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {stats.avgEnergy.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Śr. Energia</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {stats.avgMotivation.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Śr. Motywacja</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {stats.avgSleepQuality.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Śr. Jakość snu</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {stats.avgHoursSlept.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-600">Śr. Godziny snu</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {stats.totalEntries}
          </div>
          <div className="text-xs text-gray-600">Liczba wpisów</div>
        </div>
      </div>
    )
  }

  // Get current view data with proper typing
  type CurrentDataType =
    | ArchiveHierarchy[]
    | { month: number; weeks?: any[]; stats: JournalStats }[]
    | { week: number; days?: any[]; stats: JournalStats }[]
    | { day: string; entry: JournalEntry }[]

  const getCurrentData = (): CurrentDataType => {
    if (!selectedYear) {
      // Years view
      return hierarchy
    }

    const yearData = hierarchy.find((y) => y.year === selectedYear)
    if (!yearData) return []

    if (!selectedMonth) {
      // Months view
      return yearData.months || []
    }

    const monthData = yearData.months?.find((m) => m.month === selectedMonth)
    if (!monthData) return []

    if (!selectedWeek) {
      // Weeks view
      return monthData.weeks || []
    }

    // Days view
    const weekData = monthData.weeks?.find((w) => w.week === selectedWeek)
    return weekData?.days || []
  }

  if (isCheckingAuth) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Archiwum Dziennika</h1>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Archiwum Dziennika</h1>
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">Zaloguj się</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Aby zobaczyć archiwum, musisz być zalogowany
          </p>
        </Card>
      </div>
    )
  }

  const currentData = getCurrentData()
  const currentLevel = breadcrumbs[breadcrumbs.length - 1].level

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="ghost" className="gap-2">
          <ArrowLeft size={20} weight="bold" />
          Wróć
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Archiwum Dziennika
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Przeglądaj swoje wpisy</p>
        </div>
      </div>

      {/* Breadcrumbs */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <CaretRight size={16} className="text-gray-400" />}
              <button
                onClick={() => {
                  if (index < breadcrumbs.length - 1) {
                    const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
                    setBreadcrumbs(newBreadcrumbs)
                    const targetCrumb = newBreadcrumbs[newBreadcrumbs.length - 1]

                    if (targetCrumb.level === 'years') {
                      setSelectedYear(null)
                      setSelectedMonth(null)
                      setSelectedWeek(null)
                    } else if (targetCrumb.level === 'months') {
                      setSelectedYear(targetCrumb.year!)
                      setSelectedMonth(null)
                      setSelectedWeek(null)
                    } else if (targetCrumb.level === 'weeks') {
                      setSelectedYear(targetCrumb.year!)
                      setSelectedMonth(targetCrumb.month!)
                      setSelectedWeek(null)
                    }
                  }
                }}
                className={`${
                  index === breadcrumbs.length - 1
                    ? 'font-semibold text-brand-purple'
                    : 'text-gray-600 hover:text-brand-purple'
                }`}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>

        {breadcrumbs.length > 1 && (
          <Button
            onClick={navigateBack}
            variant="ghost"
            size="sm"
            className="gap-2 mt-2"
          >
            <CaretLeft size={16} weight="bold" />
            Cofnij
          </Button>
        )}
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Ładowanie archiwum...</span>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && allEntries.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📔</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Brak wpisów w archiwum
          </h3>
          <p className="text-gray-500">Zacznij pisać w dzienniku, aby zobaczyć archiwum</p>
        </Card>
      )}

      {/* Years View */}
      {!loading && currentLevel === 'years' && hierarchy.length > 0 && (
        <div className="space-y-4">
          {(currentData as ArchiveHierarchy[]).map((yearData) => (
            <Card
              key={yearData.year}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigateToMonths(yearData.year)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">{yearData.year}</h3>
                <ChartLine size={24} weight="bold" className="text-brand-purple" />
              </div>
              {renderStats(yearData.stats)}
            </Card>
          ))}
        </div>
      )}

      {/* Months View */}
      {!loading && currentLevel === 'months' && selectedYear && (
        <div className="space-y-4">
          {(currentData as any[]).map((monthData) => {
            const monthNames = [
              'Styczeń',
              'Luty',
              'Marzec',
              'Kwiecień',
              'Maj',
              'Czerwiec',
              'Lipiec',
              'Sierpień',
              'Wrzesień',
              'Październik',
              'Listopad',
              'Grudzień',
            ]
            return (
              <Card
                key={monthData.month}
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigateToWeeks(monthData.month)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">
                    {monthNames[monthData.month - 1]}
                  </h3>
                  <ChartLine size={24} weight="bold" className="text-brand-purple" />
                </div>
                {renderStats(monthData.stats)}
              </Card>
            )
          })}
        </div>
      )}

      {/* Weeks View */}
      {!loading && currentLevel === 'weeks' && selectedMonth && (
        <div className="space-y-4">
          {(currentData as any[]).map((weekData) => (
            <Card
              key={weekData.week}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigateToDays(weekData.week)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">Tydzień {weekData.week}</h3>
                <ChartLine size={24} weight="bold" className="text-brand-purple" />
              </div>
              {renderStats(weekData.stats)}
            </Card>
          ))}
        </div>
      )}

      {/* Days View */}
      {!loading && currentLevel === 'days' && selectedWeek && (
        <div className="space-y-4">
          {(currentData as any[]).map((dayData) => {
            const entry = dayData.entry as JournalEntry
            return (
              <Card key={dayData.day} className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold">
                    {format(parseISO(dayData.day), 'EEEE, d MMMM yyyy', {
                      locale: pl,
                    })}
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">Energia</div>
                    <div className="text-lg font-semibold text-brand-purple">
                      {entry.energy || 0}/10
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Motywacja</div>
                    <div className="text-lg font-semibold text-brand-purple">
                      {entry.motivation || 0}/10
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Jakość snu</div>
                    <div className="text-lg font-semibold text-brand-purple">
                      {entry.sleep_quality || 0}/10
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Godziny snu</div>
                    <div className="text-lg font-semibold text-brand-purple">
                      {entry.hours_slept || 0}h
                    </div>
                  </div>
                </div>

                {entry.notes && entry.notes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Notatki:
                    </h4>
                    <ul className="space-y-1">
                      {entry.notes.map((note, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          • {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {entry.ai_summary && (
                  <div className="p-4 bg-gradient-to-br from-brand-purple/5 to-brand-pink/5 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Podsumowanie AI:
                    </h4>
                    <p className="text-sm text-gray-700">{entry.ai_summary}</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
