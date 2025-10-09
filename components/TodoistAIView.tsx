'use client'

import { useState } from 'react'
import ChatSidebar from './ChatSidebar'
import GlobalChat from './GlobalChat'

export default function TodoistAIView({ token }: { token: string }) {
  const [tasks, setTasks] = useState<any[]>([])

  return (
    <div className="flex h-full">
      {/* 🧠 Historia rozmów globalnych */}
      <ChatSidebar onSelectChat={() => {}} />

      {/* 🤖 Czat AI */}
      <div className="flex-1 bg-white">
        <GlobalChat token={token} tasks={tasks} onOpenTaskChat={() => {}} />
      </div>
    </div>
  )
}
