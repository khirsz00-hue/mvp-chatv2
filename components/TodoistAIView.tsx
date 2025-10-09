'use client'

import { useState } from 'react'
import GlobalChat from './GlobalChat'

export default function TodoistAIView({ token }: { token: string }) {
  const [tasks, setTasks] = useState<any[]>([])

  return (
    <div className="flex h-full bg-white rounded-b-xl border-t border-gray-200">
      {/* 🤖 Czat AI (bez historii) */}
      <div className="flex-1">
        <GlobalChat token={token} tasks={tasks} onOpenTaskChat={() => {}} />
      </div>
    </div>
  )
}
