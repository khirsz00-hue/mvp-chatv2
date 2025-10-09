'use client'
import { useState } from 'react'

export default function TaskDialog({ task, mode, onClose }) {
  const [step, setStep] = useState<'choose' | 'chat'>('choose')
  const [chat, setChat] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [selectedAction, setSelectedAction] = useState<'break'|'solve'|null>(null)

  const startChat = (action: 'break'|'solve') => {
    setSelectedAction(action)
    setStep('chat')
    setChat([
      {
        role: 'assistant',
        content:
          action === 'break'
            ? `OK 💡 Rozbijmy zadanie: "${task.content}". Co jest dla Ciebie najtrudniejsze lub najbardziej niejasne?`
            : `Zajmijmy się tym zadaniem: "${task.content}". Opowiedz krótko, co już zrobiłeś i co Cię blokuje.`,
      },
    ])
  }

  const sendMessage = async () => {
    const newChat = [...chat, { role: 'user', content: input }]
    setChat(newChat)
    setInput('')

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        context: `Asystujesz przy zadaniu: "${task.content}". Tryb: ${
          selectedAction === 'break' ? 'rozbijanie na kroki' : 'szukanie rozwiązania'
        }. Zadawaj pytania doprecyzowujące, a dopiero potem proponuj konkretne kroki.`,
        messages: newChat,
      }),
    })
    const data = await res.json()
    setChat([...newChat, { role: 'assistant', content: data.reply }])
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-5 w-[450px]">
        {step === 'choose' && (
          <>
            <h2 className="text-lg font-semibold mb-4">
              W czym mam pomóc z zadaniem?
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => startChat('break')}
                className="btn bg-blue-100 hover:bg-blue-200"
              >
                🔹 Rozbij zadanie na kroki
              </button>
              <button
                onClick={() => startChat('solve')}
                className="btn bg-purple-100 hover:bg-purple-200"
              >
                💡 Zaproponuj rozwiązanie
              </button>
              <button onClick={onClose} className="text-sm text-neutral-500 mt-2">
                Anuluj
              </button>
            </div>
          </>
        )}

        {step === 'chat' && (
          <>
            <div className="h-[300px] overflow-y-auto border rounded-lg p-2 mb-3 bg-neutral-50">
              {chat.map((m, i) => (
                <div key={i} className={`my-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div
                    className={`inline-block px-2 py-1 rounded-lg ${
                      m.role === 'user'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 border rounded-lg px-2 py-1 text-sm"
                placeholder="Napisz wiadomość..."
              />
              <button onClick={sendMessage} className="btn bg-blue-600 text-white px-3 py-1 rounded-lg">
                Wyślij
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
