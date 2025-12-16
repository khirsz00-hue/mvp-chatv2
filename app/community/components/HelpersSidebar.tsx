'use client'

import { HandHeart } from '@phosphor-icons/react'

interface Helper {
  user_id: string
  score: number
}

interface HelpersSidebarProps {
  helpers: Helper[]
}

export function HelpersSidebar({ helpers }: HelpersSidebarProps) {
  if (helpers.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 sticky top-6">
        <div className="flex items-center gap-2 mb-4">
          <HandHeart size={24} className="text-pink-500" weight="fill" />
          <h2 className="text-lg font-semibold text-gray-900">
            Często wspierający
          </h2>
        </div>
        
        <p className="text-sm text-gray-600">
          W tej przestrzeni są osoby, które często wspierają innych.
        </p>
        
        <p className="text-sm text-gray-500 mt-4">
          Bądź pierwszą osobą, która udziela wsparcia! ✨
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 sticky top-6">
      <div className="flex items-center gap-2 mb-4">
        <HandHeart size={24} className="text-pink-500" weight="fill" />
        <h2 className="text-lg font-semibold text-gray-900">
          Często wspierający
        </h2>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        W tej przestrzeni są osoby, które często wspierają innych
      </p>

      <div className="space-y-3">
        {helpers.map((helper, index) => (
          <div
            key={helper.user_id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">
                Wspierający #{index + 1}
              </p>
            </div>
            <HandHeart size={16} className="text-pink-500" weight="fill" />
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Brak rankingów, brak presji — wspieramy się wzajemnie
      </p>
    </div>
  )
}
