'use client'
import { Task } from '@/lib/types'
import { useState } from 'react'

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => void
  onReschedule: (id: string, date?: string) => void
  onCoach: (task: Task) => void
}

export default function TaskCard({ task, onComplete, onReschedule, onCoach }: TaskCardProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="card flex justify-between items-center mb-2">
      <div>
        <p className="font-medium">{task.content}</p>
        {task.due && <p className="text-xs text-neutral-500">{task.due}</p>}
      </div>
      <div className="flex gap-2">
        <button className="btn text-sm" onClick={() => onComplete(task.id)}>✅</button>
        <button className="btn text-sm" onClick={() => setShowPicker(!showPicker)}>📅</button>
        <button className="btn text-sm" onClick={() => onCoach(task)}>🧠</button>
      </div>
      {showPicker && (
        <input
          type="date"
          className="input mt-2"
          onChange={(e) => {
            onReschedule(task.id, e.target.value)
            setShowPicker(false)
          }}
        />
      )}
    </div>
  )
}
