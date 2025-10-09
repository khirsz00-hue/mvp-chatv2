'use client'

import ChatDock from './ChatDock'

export default function GlobalChat({
  token,
  tasks,
  onOpenTaskChat,
}: {
  token: string
  tasks: any[]
  onOpenTaskChat: (t: any) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-gray-50 p-3 flex justify-between items-center">
        <h2 className="font-semibold text-gray-700 text-sm">🤖 Asystent Todoist AI</h2>
        <span className="text-xs text-gray-400">Tryb ogólny</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-700">
        <p className="mb-3">
          Możesz zapytać np.:
        </p>
        <ul className="list-disc ml-4 text-gray-600">
          <li>„Pokaż zadania na dziś”</li>
          <li>„Zaproponuj kolejność realizacji”</li>
          <li>„Które zadania są przeterminowane?”</li>
        </ul>

        <div className="mt-4 text-xs text-gray-500 italic">
          Historia rozmów globalnych będzie tutaj widoczna po uruchomieniu czatu.
        </div>
      </div>

      <div className="border-t bg-white p-3">
        <ChatDock mode="global" token={token} tasks={tasks} />
      </div>
    </div>
  )
}
