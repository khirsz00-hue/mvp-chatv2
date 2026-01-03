/**
 * TodaysFlowPanel Component
 * Shows key metrics for the day in a grid layout
 * Displays completed, presented, added tasks and work time
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CheckCircle, Eye, Plus, Clock } from '@phosphor-icons/react'

export interface TodaysFlowPanelProps {
  completedCount: number
  presentedCount: number
  addedCount: number
  workTimeMinutes: number
}

export function TodaysFlowPanel({
  completedCount,
  presentedCount,
  addedCount,
  workTimeMinutes
}: TodaysFlowPanelProps) {
  
  const formatWorkTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const metrics = [
    {
      icon: <CheckCircle size={24} weight="fill" className="text-green-600" />,
      label: 'Ukończone',
      value: completedCount,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    },
    {
      icon: <Eye size={24} weight="fill" className="text-yellow-600" />,
      label: 'Prezentowane',
      value: presentedCount,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700'
    },
    {
      icon: <Plus size={24} weight="bold" className="text-blue-600" />,
      label: 'Dodane',
      value: addedCount,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    {
      icon: <Clock size={24} weight="fill" className="text-purple-600" />,
      label: 'Czas pracy',
      value: formatWorkTime(workTimeMinutes),
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Today&apos;s Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className={`${metric.bgColor} ${metric.borderColor} border rounded-lg p-3 flex flex-col items-center justify-center text-center transition-all hover:shadow-md`}
            >
              <div className="mb-2">
                {metric.icon}
              </div>
              <div className={`text-2xl font-bold ${metric.textColor}`}>
                {metric.value}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
