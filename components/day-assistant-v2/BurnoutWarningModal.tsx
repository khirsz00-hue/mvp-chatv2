'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { BurnoutAssessment } from '@/lib/burnoutPrevention'

interface BurnoutWarningModalProps {
  burnout: BurnoutAssessment | null
  isOpen: boolean
  onClose: () => void
  onAction: (action: string) => void
}

export function BurnoutWarningModal({ burnout, isOpen, onClose, onAction }: BurnoutWarningModalProps) {
  if (!burnout || burnout.riskLevel !== 'high') return null
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 text-xl flex items-center gap-2">
            🚨 UWAGA: Wykryto ryzyko wypalenia
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-900 mb-2">
              Niepokojące wzorce:
            </p>
            <ul className="text-sm text-red-800 space-y-1">
              {burnout.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              📊 Metryki (ostatnie 7 dni):
            </p>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Średnia: {burnout.metrics.avgDailyHours.toFixed(1)}h/dzień</p>
              <p>• Długie dni z rzędu: {burnout.metrics.consecutiveLongDays}</p>
              <p>• Przerwy: {burnout.metrics.breaksTaken}/tydzień</p>
              <p>• Ukończone zadania: {burnout.metrics.completionRate}%</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-700">
            Twoje zdrowie jest ważniejsze niż zadania! System wykrył oznaki przeciążenia.
          </p>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">💡 Zalecane działania:</p>
            {burnout.recommendations.map((rec, i) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start text-left text-sm"
                onClick={() => {
                  onAction(rec)
                  onClose()
                }}
              >
                {rec}
              </Button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            className="w-full text-sm text-gray-600"
            onClick={onClose}
          >
            Zignoruj ostrzeżenie (niezalecane)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
