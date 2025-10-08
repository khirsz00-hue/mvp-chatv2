'use client'
import { useState } from 'react'
import Link from 'next/link'

interface SidebarProps {
  assistants: { id: string; name: string }[]
  active: string
  onSelect: (id: string) => void
}

export default function Sidebar({ assistants, active, onSelect }: SidebarProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className={`transition-all ${open ? 'w-56' : 'w-10'} bg-white/60 backdrop-blur rounded-2xl shadow-sm border border-neutral-200 p-3`}>
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold">{open ? 'Asystenci' : '🤖'}</span>
        <button className="text-xs text-neutral-500" onClick={() => setOpen(!open)}>
          {open ? '⮜' : '⮞'}
        </button>
      </div>
      <div className="space-y-2">
        {assistants.map((a) => (
          <button
            key={a.id}
            className={`w-full text-left px-2 py-1 rounded-lg ${a.id === active ? 'bg-blue-100 text-blue-700' : 'hover:bg-neutral-100'}`}
            onClick={() => onSelect(a.id)}
          >
            {a.name}
          </button>
        ))}
        <Link href="/admin" className="block mt-4 text-sm text-blue-600 hover:underline">
          ⚙️ Admin
        </Link>
      </div>
    </div>
  )
}
