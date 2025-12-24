'use client'

interface TimeStatsCompactProps {
  usedMinutes: number
  availableMinutes: number
  usagePercentage: number
}

export function TimeStatsCompact({ 
  usedMinutes, 
  availableMinutes, 
  usagePercentage 
}: TimeStatsCompactProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min`
  }
  
  // Color coding based on usage
  const getColorClass = () => {
    if (usagePercentage >= 90) return 'text-red-700 bg-red-100 border-red-300'
    if (usagePercentage >= 70) return 'text-orange-700 bg-orange-100 border-orange-300'
    return 'text-blue-700 bg-blue-100 border-blue-300'
  }
  
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${getColorClass()}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">⏱️</span>
        <div>
          <p className="text-sm font-bold">
            {formatTime(usedMinutes)} / {formatTime(availableMinutes)}
          </p>
          <p className="text-xs opacity-80">
            Zaplanowane / Dostępne
          </p>
        </div>
      </div>
      
      {/* Compact percentage badge */}
      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
        usagePercentage >= 90 ? 'bg-red-200 text-red-800' :
        usagePercentage >= 70 ? 'bg-orange-200 text-orange-800' :
        'bg-blue-200 text-blue-800'
      }`}>
        {Math.round(usagePercentage)}%
      </div>
    </div>
  )
}
