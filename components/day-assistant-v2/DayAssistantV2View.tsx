/**
 * Day Assistant V2 View - Web Version
 * Main view component for Day Assistant V2 functionality
 */

'use client'

import { useState, useEffect } from 'react'
import { UniversalTaskModal, TaskData } from '@/components/common/UniversalTaskModal'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'

export function DayAssistantV2View() {
  const [showUniversalModal, setShowUniversalModal] = useState(false)
  const [universalModalTask, setUniversalModalTask] = useState<TaskData | null>(null)

  // 🎮 GAMIFICATION: Keyboard shortcut for quick add (Ctrl/Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setUniversalModalTask(null)     // ✅ Open in CREATE mode
        setShowUniversalModal(true)     // ✅ Show UniversalTaskModal
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleTaskSave = async (taskData: TaskData) => {
    try {
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        toast.error('Sesja wygasła - zaloguj się ponownie')
        return
      }

      const accessToken = session.access_token

      if (universalModalTask) {
        // Update existing task
        const response = await fetch('/api/todoist/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            id: universalModalTask.id,
            content: taskData.content,
            description: taskData.description || '',
            due_date: taskData.due,
            priority: taskData.priority || 1,
            labels: taskData.labels || [],
            duration: taskData.estimated_minutes
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update task')
        }

        toast.success('Zadanie zaktualizowane')
      } else {
        // Create new task
        const response = await fetch('/api/todoist/tasks/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            content: taskData.content,
            description: taskData.description || '',
            due_date: taskData.due,
            priority: taskData.priority || 1,
            labels: taskData.labels || [],
            project_id: taskData.project_id,
            duration: taskData.estimated_minutes
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create task')
        }

        toast.success('Zadanie dodane')
      }
      
      setShowUniversalModal(false)
      setUniversalModalTask(null)
    } catch (error) {
      console.error('Error saving task:', error)
      toast.error('Błąd podczas zapisywania zadania')
    }
  }

  return (
    <div className="p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Day Assistant V2</h1>
        <p className="text-muted-foreground mb-4">
          Naciśnij Ctrl+K (lub Cmd+K na Mac), aby dodać zadanie
        </p>
        
        <button
          type="button"
          onClick={() => {
            setUniversalModalTask(null)
            setShowUniversalModal(true)
          }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          aria-label="Dodaj zadanie"
        >
          Dodaj zadanie
        </button>
      </div>

      {/* UniversalTaskModal for task creation/editing */}
      <UniversalTaskModal
        open={showUniversalModal}
        onOpenChange={setShowUniversalModal}
        task={universalModalTask}
        defaultDate={new Date().toISOString().split('T')[0]}
        onSave={handleTaskSave}
      />
    </div>
  )
}
