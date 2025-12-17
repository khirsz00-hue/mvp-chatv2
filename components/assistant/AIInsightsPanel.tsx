'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Sparkle, Warning, CheckCircle, Info, CaretDown, CaretUp, ArrowClockwise } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AIInsight {
  type: 'warning' | 'success' | 'info'
  title: string
  description: string
  actionText?: string
}

interface Task {
  id: string
  content: string
  priority: 1 | 2 | 3 | 4
  due?: { date: string } | string
  completed?: boolean
  completed_at?: string
}

interface AIInsightsPanelProps {
  tasks: Task[]
  completedTasks?: Task[]
  className?: string
}

export function AIInsightsPanel({ tasks, completedTasks = [], className }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  
  // Auto-generate insights on mount if not collapsed
  const generateInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map(t => ({
            content: t.content,
            priority: t.priority,
            due: typeof t.due === 'string' ? t.due : t.due?.date
          })),
          completedTasks: completedTasks.map(t => ({
            content: t.content,
            completed_at: t.completed_at
          }))
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }
      
      const data = await response.json()
      
      if (!data.insights || !Array.isArray(data.insights)) {
        throw new Error('Invalid response format')
      }
      
      setInsights(data.insights)
    } catch (err: any) {
      console.error('Error generating insights:', err)
      setError(err.message || 'Nie udało się wygenerować insightów')
    } finally {
      setLoading(false)
    }
  }, [completedTasks, tasks])
  
  useEffect(() => {
    if (!hasGenerated && !isCollapsed && tasks.length > 0) {
      generateInsights()
      setHasGenerated(true)
    }
  }, [generateInsights, hasGenerated, isCollapsed, tasks])
  
  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning':
        return <Warning size={20} weight="fill" className="text-orange-600" />
      case 'success':
        return <CheckCircle size={20} weight="fill" className="text-green-600" />
      case 'info':
        return <Info size={20} weight="fill" className="text-blue-600" />
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
  
  if (tasks.length === 0) {
    return null
  }
  
  return (
    <Card className={cn('mb-6 overflow-hidden', className)}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Sparkle size={20} weight="fill" className="text-brand-purple" />
          <h3 className="font-semibold text-gray-900">AI Insights</h3>
          {insights.length > 0 && !isCollapsed && (
            <Badge variant="secondary" className="text-xs">
              {insights.length}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isCollapsed && !loading && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                generateInsights()
              }}
              className="gap-1 text-xs"
            >
              <ArrowClockwise size={14} />
              Odśwież
            </Button>
          )}
          {isCollapsed ? (
            <CaretDown size={20} weight="bold" className="text-gray-500" />
          ) : (
            <CaretUp size={20} weight="bold" className="text-gray-500" />
          )}
        </div>
      </div>
      
      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-600">Analizuję twoje zadania...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          {!loading && !error && insights.length === 0 && (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm mb-3">Brak insightów do wyświetlenia</p>
              <Button
                size="sm"
                variant="outline"
                onClick={generateInsights}
                className="gap-2"
              >
                <Sparkle size={16} weight="fill" />
                Wygeneruj insights
              </Button>
            </div>
          )}
          
          {!loading && insights.length > 0 && (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={cn(
                    'border rounded-lg p-4 transition-all hover:shadow-md',
                    getInsightBgColor(insight.type)
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        {insight.description}
                      </p>
                      {insight.actionText && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            'text-xs mt-1',
                            insight.type === 'warning' && 'text-orange-700 hover:bg-orange-100',
                            insight.type === 'success' && 'text-green-700 hover:bg-green-100',
                            insight.type === 'info' && 'text-blue-700 hover:bg-blue-100'
                          )}
                        >
                          {insight.actionText}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
