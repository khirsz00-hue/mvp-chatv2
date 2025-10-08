'use client'
import { Task } from '@/lib/types'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  task: Task | null
  onClose: () => void
  onConfirm: (steps: string[]) => void
}

export default function TaskCoachDialog({ task, onClose, onConfirm }: Props) {
  const [analysis, setAnalysis] = useState('')
  const [steps, setSteps] = useState<string[]>([])

  const generateSteps = () => {
    if (!analysis.trim()) return
    const ideas = analysis
      .split(/[.,;]/)
      .map(s => s.trim())
      .filter(Boolean)
    setSteps(ideas)
  }

  if (!task) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="card max-w-lg w-full"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
        >
          <h2 className="text-lg font-semibold mb-2">🧠 Pomoc z zadaniem</h2>
          <p className="text-sm text-neutral-600 mb-3">Zadanie: {task.content}</p>
          <textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            className="input h-32 mb-3"
            placeholder="Opisz problem lub doprecyzuj kontekst..."
          />
          <button className="btn btn-primary w-full mb-2" onClick={generateSteps}>
            Rozbij na kroki
          </button>

          {steps.length > 0 && (
            <ul className="list-disc list-inside text-sm text-neutral-700 space-y-1 mb-3">
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}

          <div className="flex justify-between">
            <button className="btn text-sm" onClick={onClose}>Anuluj</button>
            <button
              className="btn btn-primary text-sm"
              onClick={() => {
                onConfirm(steps)
                onClose()
              }}
            >
              Zapisz
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
