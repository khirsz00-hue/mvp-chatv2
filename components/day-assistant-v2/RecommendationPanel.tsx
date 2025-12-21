/**
 * RecommendationPanel Component
 * Shows actionable recommendations with Accept/Reject buttons
 */

'use client'

import { useState } from 'react'
import { DayPlan, Proposal } from '@/lib/types/dayAssistantV2'
import Button from '@/components/ui/Button'
import { XCircle, CheckCircle } from '@phosphor-icons/react'

interface RecommendationPanelProps {
  dayPlan: DayPlan | null
  proposals: Proposal[]
  onProposalResponse: (proposalId: string, action: 'accept_primary' | 'accept_alt' | 'reject', alternativeIndex?: number, rejectReason?: string) => void
}

export function RecommendationPanel({ dayPlan, proposals, onProposalResponse }: RecommendationPanelProps) {
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingProposal, setRejectingProposal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [customReason, setCustomReason] = useState('')

  const handleReject = (proposalId: string) => {
    setRejectingProposal(proposalId)
    setShowRejectModal(true)
  }

  const confirmReject = () => {
    if (rejectingProposal) {
      const finalReason = rejectReason === 'other' ? customReason : rejectReason
      onProposalResponse(rejectingProposal, 'reject', undefined, finalReason)
    }
    setShowRejectModal(false)
    setRejectingProposal(null)
    setRejectReason('')
    setCustomReason('')
  }

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
                Polecam lekkie zadania z kontekstu &apos;prywatne&apos; (osobiste, niskointensywne)
              </p>
            </div>
          )}
          
          {/* Low focus recommendation */}
          {dayPlan.focus <= 2 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Niskie skupienie ({dayPlan.focus}/5)</strong>
                <br />
                Trudne zadania lepiej przełożyć lub użyć techniki &quot;Zacznij 10 min&quot;
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
      
      {/* System proposals - Actionable format */}
      {proposals.length === 0 && !dayPlan && (
        <p className="text-sm text-muted-foreground">
          Brak aktywnych rekomendacji. Zmiany energii/skupienia lub nowe zadania wywołają live replanning.
        </p>
      )}
      {proposals.slice(0, 1).map(proposal => (
        <div key={proposal.id} className="border-2 rounded-lg p-4 space-y-3 bg-purple-50 border-purple-300">
          <div className="flex items-start gap-2">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="font-semibold text-purple-900 mb-1">REKOMENDACJA</p>
              <p className="text-sm text-purple-800">{proposal.reason}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              onClick={() => onProposalResponse(proposal.id, 'accept_primary')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={16} className="mr-1" weight="fill" /> Zatwierdź
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
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleReject(proposal.id)}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle size={16} className="mr-1" /> Odrzuć
            </Button>
          </div>
        </div>
      ))}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Dlaczego odrzucasz rekomendację?</h2>
              <button onClick={() => setShowRejectModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reject-reason"
                  value="too_difficult"
                  checked={rejectReason === 'too_difficult'}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <span className="text-sm">Za trudne teraz</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reject-reason"
                  value="prefer_other"
                  checked={rejectReason === 'prefer_other'}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <span className="text-sm">Wolę zacząć od czegoś innego</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reject-reason"
                  value="not_enough_time"
                  checked={rejectReason === 'not_enough_time'}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <span className="text-sm">Nie mam wystarczająco czasu</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reject-reason"
                  value="other"
                  checked={rejectReason === 'other'}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <span className="text-sm">Inne:</span>
              </label>
              {rejectReason === 'other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Wpisz powód..."
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
                Anuluj
              </Button>
              <Button 
                onClick={confirmReject} 
                disabled={!rejectReason}
                aria-label={!rejectReason ? "Wybierz powód aby kontynuować" : "Zapisz powód odrzucenia"}
                title={!rejectReason ? "Wybierz powód aby kontynuować" : undefined}
              >
                💾 Zapisz
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
