'use client'

import React, { useEffect, useState } from 'react'

export default function KnowledgeEditor() {
  const [assistant, setAssistant] = useState<string>('todoist')
  const [files, setFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [prompt, setPrompt] = useState<string>('')

  useEffect(() => {
    loadFiles()
  }, [assistant])

  async function loadFiles() {
    try {
      const res = await fetch(`/api/admin/knowledge?assistant=${encodeURIComponent(assistant)}`)
      const data = await res.json()
      setFiles(data.files || [])
    } catch (err) {
      console.error('loadFiles error', err)
      setFiles([])
    }
  }

  async function openFile(file: string) {
    try {
      const res = await fetch(`/api/admin/knowledge?assistant=${encodeURIComponent(assistant)}&file=${encodeURIComponent(file)}`)
      const data = await res.json()
      setActiveFile(file)
      setContent(data.content || '')
    } catch (err) {
      console.error('openFile error', err)
    }
  }

  async function saveFile() {
    try {
      await fetch(`/api/admin/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistant, file: activeFile, content }),
      })
      alert('Plik zapisany 📄')
    } catch (err) {
      console.error('saveFile error', err)
      alert('Błąd zapisu')
    }
  }

  async function savePrompt() {
    // simple handler - store prompt in localStorage (or send to API)
    localStorage.setItem(`prompt_${assistant}`, prompt)
    alert('Prompt saved locally')
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">🧠 Edytor promptów i wiedzy</h1>

      <div className="flex gap-4 items-center">
        <select className="input w-48" value={assistant} onChange={(e) => setAssistant(e.target.value)}>
          <option value="todoist">Todoist Helper</option>
          <option value="six_hats">Six Thinking Hats</option>
        </select>

        <button className="btn btn-primary text-sm" onClick={savePrompt}>💾 Zapisz prompt</button>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="input h-40 font-mono text-sm w-full"
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
                className="input h-64 font-mono text-sm w-full"
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
