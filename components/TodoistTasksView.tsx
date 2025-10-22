// Krótka modyfikacja: zamiast raz jeszcze komplikować parser, używamy parseDueToLocalYMD
'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoistTasks from './TodoistTasks'
import WeekView from './WeekView'
import TaskDialog from './TaskDialog'
import { parseDueToLocalYMD, ymdFromDate } from '../utils/date' // <- import

export default function TodoistTasksView({ token, onUpdate, hideHeader = false }: { token: string; onUpdate?: () => void; hideHeader?: boolean }) {
  const [filter, setFilter] = useState<'today'|'tomorrow'|'overdue'|'7 days'|'30 days'>(() => typeof window !== 'undefined' ? ((localStorage.getItem('todoist_filter') as any) || 'today') : 'today')
  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [toast, setToast] = useState<string|null>(null)
  const [viewMode, setViewMode] = useState<'list'|'week'>(() => (typeof window !== 'undefined' && (localStorage.getItem('todoist_filter') === '7 days')) ? 'week' : 'list')
  const lastEvent = useRef<number>(0)
  const [openTask, setOpenTask] = useState<any|null>(null)
  const [showAdd, setShowAdd] = useState(false)
  // ... (add task state omitted for brevity) ...

  const fetchTasks = async () => {
    if (!token) return
    try {
      let filterQuery = ''
      switch (filter) {
        case 'today': filterQuery = 'today | overdue'; break
        case 'tomorrow': filterQuery = 'tomorrow'; break
        case '7 days': filterQuery = '7 days'; break
        case '30 days': filterQuery = '30 days'; break
        case 'overdue': filterQuery = 'overdue'; break
      }

      const res = await fetch(`/api/todoist/tasks?token=${encodeURIComponent(token)}&filter=${encodeURIComponent(filterQuery)}`)
      const data = await res.json()
      let fetched = data.tasks || []

      if (selectedProject !== 'all') fetched = fetched.filter((t:any) => t.project_id === selectedProject)

      if (filter === 'today') {
        const todayYmd = ymdFromDate(new Date())
        const overdue = fetched.filter((t:any) => {
          const ymd = parseDueToLocalYMD(t.due)
          return ymd ? ymd < todayYmd : false
        })
        const todayTasks = fetched.filter((t:any) => {
          const ymd = parseDueToLocalYMD(t.due)
          return ymd ? ymd === todayYmd : false
        })
        setTasks([...overdue, ...todayTasks])
      } else {
        setTasks(fetched)
      }
    } catch (err) {
      console.error('❌ Błąd pobierania zadań:', err)
    }
  }

  // reszta pliku bez zmian (SSE/polling, render) - WeekView już korzysta z task.due/_due if present
  // upewnij się, że WeekView też korzysta z parseDueToLocalYMD lub task._dueYmd
  // ...
}
