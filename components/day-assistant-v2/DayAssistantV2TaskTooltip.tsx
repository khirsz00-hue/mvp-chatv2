/**
 * DayAssistantV2TaskTooltip - Score breakdown tooltip with AI understanding
 * Part of Day Assistant V2 Complete Overhaul
 */

import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Info } from '@phosphor-icons/react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

interface DayAssistantV2TaskTooltipProps {
  task: TestDayTask
  queuePosition: number
}

export function DayAssistantV2TaskTooltip({ task, queuePosition }: DayAssistantV2TaskTooltipProps) {
  const score = task.metadata?._score || 0
  const reasoning = task.metadata?._scoreReasoning || []
  const aiUnderstanding = task.metadata?.ai_understanding || null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1 cursor-help">
          <span className="text-sm font-medium text-gray-700">
            📊 Score: {Math.round(score)}
          </span>
          <Info size={14} className="text-gray-400" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-md">
        <div className="space-y-3 text-xs">
          {/* Score breakdown header */}
          <div>
            <div className="font-bold text-sm mb-1">🎯 Dlaczego pozycja #{queuePosition}?</div>
            <div className="text-gray-300">📊 Całkowity score: {Math.round(score)}/100</div>
          </div>

          {/* Score factors */}
          {reasoning.length > 0 && (
            <div>
              <div className="font-semibold mb-1">Składowe:</div>
              <div className="space-y-0.5">
                {reasoning.map((line: string, idx: number) => (
                  <div key={idx} className="text-gray-200">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {reasoning.length > 0 && (
            <div className="border-t border-gray-700" />
          )}

          {/* Motivational message */}
          <div className="text-gray-300 italic">
            💡 To zadanie jest {queuePosition === 1 ? 'najważniejsze - zacznij od niego!' : `na pozycji #${queuePosition} w kolejce`}
          </div>

          {/* AI Understanding section */}
          {aiUnderstanding && (
            <>
              <div className="border-t border-gray-700" />
              <div>
                <div className="font-semibold mb-1">🤖 Jak AI rozumie to zadanie:</div>
                <div className="text-gray-200 leading-relaxed">
                  {aiUnderstanding}
                </div>
              </div>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
