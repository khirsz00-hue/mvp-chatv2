'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../ui'
import type { Decision } from '@/lib/types/decisions'

interface DecisionListProps {
  decisions: Decision[]
  isLoading: boolean
  onSelectDecision: (id: string) => void
}

const statusLabels: Record<string, string> = {
  pending: 'Do rozważenia',
  analyzing: 'Analizuję...',
  analyzed: 'Przeanalizowana',
  decided: 'Zdecydowano',
  archived: 'Archiwum',
}

const statusColors: Record<string, 'default' | 'purple' | 'success' | 'secondary' | 'outline'> = {
  pending: 'default',
  analyzing: 'secondary',
  analyzed: 'purple',
  decided: 'success',
  archived: 'outline',
}

export default function DecisionList({ decisions, isLoading, onSelectDecision }: DecisionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (decisions.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">Brak decyzji do wyświetlenia</p>
          <p className="text-gray-400 text-sm">
            Kliknij &ldquo;Nowa decyzja&rdquo; aby zacząć
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {decisions.map((decision) => (
        <Card
          key={decision.id}
          className="glass hover:shadow-glow transition-all cursor-pointer"
          onClick={() => onSelectDecision(decision.id)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{decision.title}</CardTitle>
                {decision.description && (
                  <CardDescription className="line-clamp-2">
                    {decision.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant={statusColors[decision.status]}>
                {statusLabels[decision.status] || decision.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
              <span>
                Utworzono {formatDistanceToNow(new Date(decision.created_at), { addSuffix: true, locale: pl })}
              </span>
              {decision.updated_at !== decision.created_at && (
                <span>
                  • Zaktualizowano {formatDistanceToNow(new Date(decision.updated_at), { addSuffix: true, locale: pl })}
                </span>
              )}
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
