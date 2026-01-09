'use client'

import Card from '@/components/ui/Card'

interface StatsData {
  yesterdayCompleted: number
  yesterdayTotal: number
  todayTotal: number
  todayHighPriority: number
}

interface QuickStatsProps {
  stats: StatsData
  className?: string
}

export default function QuickStats({ stats, className = '' }: QuickStatsProps) {
  const completionRate = stats.yesterdayTotal > 0 
    ? Math.round((stats.yesterdayCompleted / stats.yesterdayTotal) * 100)
    : 0

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Statystyki</h3>
      
      <div className="space-y-4">
        {/* Yesterday completion */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Wczoraj</span>
            <span className="text-sm font-bold text-green-600">
              {stats.yesterdayCompleted}/{stats.yesterdayTotal} zadań
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          {stats.yesterdayTotal > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {completionRate}% ukończonych
            </p>
          )}
        </div>

        {/* Today's tasks */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Dzisiaj</span>
            <span className="text-sm font-bold text-amber-600">
              {stats.todayTotal} {stats.todayTotal === 1 ? 'zadanie' : 'zadań'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.todayHighPriority}</div>
              <div className="text-xs text-orange-700">Wysoki priorytet</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.todayTotal - stats.todayHighPriority}</div>
              <div className="text-xs text-blue-700">Normalny priorytet</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
