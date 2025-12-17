'use client'

import { HandHeart, ChatCircle, ChatsCircle } from '@phosphor-icons/react'
import { generateNickname, getNicknameInitials } from '@/utils/nickname'

interface Helper {
  user_id: string
  score: number
  post_count?: number
  comment_count?: number
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
        {helpers.map((helper) => {
          const nickname = generateNickname(helper.user_id)
          const initials = getNicknameInitials(nickname)

          return (
            <div
              key={helper.user_id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50/60 transition-colors border border-transparent hover:border-purple-100"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {nickname}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <ChatsCircle size={14} />
                    {helper.comment_count ?? 0} odpowiedzi
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ChatCircle size={14} />
                    {helper.post_count ?? 0} postów
                  </span>
                </div>
              </div>
            <div className="flex flex-col items-center text-pink-500">
              <HandHeart size={18} weight="fill" />
              <span className="text-xs font-semibold text-gray-700">
                {helper.score}
              </span>
              <span className="text-[10px] text-gray-500 leading-none mt-1">
                Pomocne
              </span>
            </div>
          </div>
        )
      })}
    </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Brak rankingów, brak presji — wspieramy się wzajemnie
      </p>
    </div>
  )
}
