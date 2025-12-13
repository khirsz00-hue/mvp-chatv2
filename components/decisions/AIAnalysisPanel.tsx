'use client'

import React from 'react'
import { Sparkle, Robot } from '@phosphor-icons/react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '../ui'
import ReactMarkdown from 'react-markdown'
import type { DecisionWithOptions, AIAnalysisResponse } from '@/lib/types/decisions'

interface AIAnalysisPanelProps {
  decision: DecisionWithOptions
  analysisResult: AIAnalysisResponse | null
  isAnalyzing: boolean
  onAnalyze: () => void
}

export default function AIAnalysisPanel({
  decision,
  analysisResult,
  isAnalyzing,
  onAnalyze,
}: AIAnalysisPanelProps) {
  const hasOptions = decision.options && decision.options.length > 0
  const hasAnalysis = analysisResult !== null

  return (
    <Card className="glass-purple border-2 border-brand-purple">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-purple rounded-lg">
              <Sparkle className="w-6 h-6 text-white" weight="fill" />
            </div>
            <CardTitle className="text-xl">Analiza AI</CardTitle>
          </div>
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing || !hasOptions}
            className="flex items-center gap-2 bg-brand-purple hover:bg-brand-purple/90"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Analizuję...
              </>
            ) : (
              <>
                <Sparkle weight="bold" />
                {hasAnalysis ? 'Analizuj ponownie' : 'Uruchom analizę AI'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasOptions && (
          <div className="text-center py-8 text-gray-500">
            <Robot className="w-12 h-12 mx-auto mb-3 text-brand-purple" weight="duotone" />
            <p>Dodaj opcje do rozważenia, aby uruchomić analizę AI</p>
          </div>
        )}

        {hasOptions && !hasAnalysis && !isAnalyzing && (
          <div className="text-center py-8 text-gray-500">
            <Sparkle className="w-12 h-12 mx-auto mb-3 text-brand-purple" weight="duotone" />
            <p>Kliknij &ldquo;Uruchom analizę AI&rdquo; aby otrzymać rekomendacje</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="py-8 space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-brand-purple/20 rounded w-3/4"></div>
              <div className="h-4 bg-brand-purple/20 rounded w-full"></div>
              <div className="h-4 bg-brand-purple/20 rounded w-5/6"></div>
            </div>
          </div>
        )}

        {hasAnalysis && !isAnalyzing && (
          <div className="prose prose-sm max-w-none">
            <div className="p-4 bg-white/50 rounded-lg">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-3 text-brand-purple" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mb-2 mt-4 text-brand-purple" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-base font-semibold mb-2 mt-3" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-gray-700" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold text-brand-purple" {...props} />,
                }}
              >
                {analysisResult.analysis}
              </ReactMarkdown>

              {analysisResult.recommendation && (
                <div className="mt-6 p-4 bg-brand-purple/10 rounded-lg border border-brand-purple">
                  <p className="font-semibold text-brand-purple mb-2">Rekomendacja:</p>
                  <p className="text-gray-700">{analysisResult.recommendation}</p>
                </div>
              )}

              {analysisResult.confidence && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Pewność AI:</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-purple transition-all"
                      style={{ width: `${analysisResult.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-brand-purple">
                    {analysisResult.confidence}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
