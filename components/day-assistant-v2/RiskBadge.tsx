'use client'

import Badge from '@/components/ui/Badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Lightbulb } from '@phosphor-icons/react'
import { RiskAssessment } from '@/lib/riskPrediction'

interface RiskBadgeProps {
  risk: RiskAssessment
  onActionClick?: (action: string) => void
}

export function RiskBadge({ risk, onActionClick }: RiskBadgeProps) {
  if (risk.riskLevel === 'low' && risk.probability >= 90) {
    // Don't show badge for very safe tasks
    return null
  }
  
  return (
    <div className="flex items-center gap-1">
      {risk.riskLevel === 'high' && (
        <Badge variant="destructive" className="gap-1 text-xs">
          🔴 {risk.probability}%
        </Badge>
      )}
      
      {risk.riskLevel === 'medium' && (
        <Badge className="gap-1 text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
          🟡 {risk.probability}%
        </Badge>
      )}
      
      {risk.riskLevel === 'low' && (
        <Badge className="gap-1 text-xs bg-green-100 text-green-800 border-green-300">
          🟢 {risk.probability}%
        </Badge>
      )}
      
      {risk.recommendations.length > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Lightbulb size={16} className="text-amber-500 cursor-help" weight="fill" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              {risk.recommendations.map((rec, idx) => (
                <div key={idx} className="text-sm">
                  <p className="font-medium">{rec.title}</p>
                  <ul className="mt-1 space-y-1">
                    {rec.actions.map((action, actionIdx) => (
                      <li 
                        key={actionIdx}
                        className="text-xs cursor-pointer hover:text-purple-600"
                        onClick={() => onActionClick?.(action.action)}
                      >
                        {action.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {risk.factors.length > 0 && (
                <div className="text-xs text-gray-600 mt-2 pt-2 border-t">
                  <p className="font-medium mb-1">Czynniki ryzyka:</p>
                  {risk.factors.map((factor, idx) => (
                    <p key={idx}>• {factor}</p>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
