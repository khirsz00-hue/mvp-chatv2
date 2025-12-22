/**
 * LoadingStates Component
 * Loading indicators and overlays for Day Assistant v2
 */

'use client'

import { ArrowsClockwise } from '@phosphor-icons/react'

export function QueueReorderingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-lg">
      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
        <ArrowsClockwise className="w-4 h-4 animate-spin text-brand-purple" />
        <span className="text-sm font-medium text-gray-700">Przebudowuję kolejkę...</span>
      </div>
    </div>
  )
}

export function RecommendationSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 animate-pulse bg-white">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  )
}

export function LoadingSpinner({ message = 'Ładowanie...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple" />
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  )
}
