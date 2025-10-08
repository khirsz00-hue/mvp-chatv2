'use client'
import { useEffect, useState } from 'react'

export default function KnowledgeEditor() {
  const [assistant, setAssistant] = useState('todoist')
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => { loadPrompt() }, [assistant])
  const loadPrompt = async () => {
    const res = await fetch(`/api/admin/prompt?assistant=${assistant}`)
    const data = await res.json()
    setPrompt(data.content || '')
    loadFiles()
  }

  const savePrompt = async () => {
    await fetch('/api/admin/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistant, content: prompt })
    })
    alert('Prompt zapisany ✅')
  }

  const loadFiles = async () => {
    const res = await fetch(`/api/admin/knowledge?assistant=${assistant}`)
    const data = await res.json()
    setFiles(data.files || [])
  }

  const openFile = async (file: string) => {
    const res = await fetch(`/api/admin/knowledge?assistant=${assistant}&file=${file}`)
    const data = await res.json()
    setActiveFile(file)
    setContent(data.content || '')
  }

  const saveFile = async () => {
    await fetch(`/api/admin/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistant, file: activeFile, content })
    })
    alert('Plik zapisany 📄')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">🧠 Edytor promptów i wiedzy</h1>

      <div className="flex gap-4">
        <select className="input w-48" value={assistant} onChange={(e) => setAssistant(e.target.value)}>
          <option value="todoist">Todoist Helper</option>
          <option value="six_hats">Six Thinking Hats</option>
        </select>

        <button className="btn btn-primary text-sm" onClick={savePrompt}>💾 Zapisz prompt</button>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="input h-40 font-mono text-sm"
        placeholder="Treść promptu..."
      />

      <hr className="my-4" />

      <div className="flex gap-8">
        <div className="w-1/4">
          <h3 className="font-medium mb-2">Pliki wiedzy</h3>
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f}>
                <button
                  className={`w-full text-left px-2 py-1 rounded-lg ${activeFile === f ? 'bg-blue-100' : 'hover:bg-neutral-100'}`}
                  onClick={() => openFile(f)}
                >
                  {f}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          <h3 className="font-medium mb-2">{activeFile || 'Wybierz plik'}</h3>
          {activeFile && (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input h-64 font-mono text-sm"
              />
              <button className="btn btn-primary text-sm mt-2" onClick={saveFile}>
                💾 Zapisz plik
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
