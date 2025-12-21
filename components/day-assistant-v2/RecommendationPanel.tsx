/**
 * RecommendationPanel Component
 * Shows contextual recommendations based on energy/focus state
 */

'use client'

import { DayPlan, Proposal } from '@/lib/types/dayAssistantV2'
import Button from '@/components/ui/Button'

interface RecommendationPanelProps {
  dayPlan: DayPlan | null
  proposals: Proposal[]
  onProposalResponse: (proposalId: string, action: 'accept_primary' | 'accept_alt' | 'reject', alternativeIndex?: number) => void
}

export function RecommendationPanel({ dayPlan, proposals, onProposalResponse }: RecommendationPanelProps) {
  return (
    <div className="space-y-3">
      {/* Contextual recommendations based on energy/focus */}
      {dayPlan && (
        <div className="space-y-2">
          {/* Low energy recommendation */}
          {dayPlan.energy <= 2 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                💡 <strong>Niska energia ({dayPlan.energy}/5)</strong>
                <br />
                Polecam lekkie zadania z kontekstu 'prywatne' (osobiste, niskointensywne)
              </p>
            </div>
          )}
          
          {/* Low focus recommendation */}
          {dayPlan.focus <= 2 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Niskie skupienie ({dayPlan.focus}/5)</strong>
                <br />
                Trudne zadania lepiej przełożyć lub użyć techniki "Zacznij 10 min"
              </p>
            </div>
          )}
          
          {/* High energy + focus recommendation */}
          {dayPlan.energy >= 4 && dayPlan.focus >= 4 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                💡 <strong>Wysoka energia i skupienie ({dayPlan.energy}/5, {dayPlan.focus}/5)</strong>
                <br />
                Idealny moment na najtrudniejsze zadania!
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* System proposals */}
      {proposals.length === 0 && !dayPlan && (
        <p className="text-sm text-muted-foreground">
          Brak aktywnych rekomendacji. Zmiany suwaków, „Nie dziś" lub nowe zadania wywołają live replanning.
        </p>
      )}
      {proposals.slice(0, 1).map(proposal => (
        <div key={proposal.id} className="border rounded-lg p-3 space-y-2 bg-purple-50 border-purple-200">
          <p className="font-medium text-purple-900">{proposal.reason}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onProposalResponse(proposal.id, 'accept_primary')}>
              Zastosuj
            </Button>
            {proposal.alternatives?.map((alt, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                onClick={() => onProposalResponse(proposal.id, 'accept_alt', idx)}
              >
                Alternatywa {idx + 1}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => onProposalResponse(proposal.id, 'reject')}>
              Odrzuć
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
