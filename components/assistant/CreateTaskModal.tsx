'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { CalendarBlank, Clock, Tag, FolderOpen, Flag } from '@phosphor-icons/react'
import { format, addDays } from 'date-fns'

interface Project {
  id: string
  name: string
  color?:  string
}

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTask: (taskData: any) => Promise<void>
}

export function CreateTaskModal({ open, onOpenChange, onCreateTask }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4)
  const [projectId, setProjectId] = useState<string>('')
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0)
  const [labels, setLabels] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({})
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('todoist_token') : null
  
  // Fetch projects on mount
  useEffect(() => {
    if (! open || !token) return
    
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/todoist/projects? token=${token}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data. projects || data || [])
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }
    
    fetchProjects()
  }, [open, token])
  
  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority(4)
      setProjectId('')
      setEstimatedMinutes(0)
      setLabels('')
      setErrors({})
    }
  }, [open])
  
  const validate = () => {
    const newErrors:  { title?: string; dueDate?: string } = {}
    
    if (!title.trim()) {
      newErrors.title = 'Tytuł jest wymagany'
    }
    
    if (dueDate) {
      const date = new Date(dueDate)
      if (isNaN(date.getTime())) {
        newErrors.dueDate = 'Nieprawidłowa data'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setLoading(true)
    
    try {
      const taskData:  any = {
        content: title. trim(),
        token
      }
      
      if (description.trim()) {
        taskData.description = description.trim()
      }
      
      if (dueDate) {
        taskData.due_date = dueDate
      }
      
      if (priority < 4) {
        taskData.priority = priority
      }
      
      if (projectId) {
        taskData.project_id = projectId
      }
      
      if (labels. trim()) {
        taskData. labels = labels.split(',').map(l => l.trim()).filter(Boolean)
      }
      
      // Custom metadata (może być używane lokalnie)
      if (estimatedMinutes > 0) {
        taskData.duration = estimatedMinutes
      }
      
      await onCreateTask(taskData)
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Nie udało się utworzyć zadania')
    } finally {
      setLoading(false)
    }
  }
  
  const priorityOptions = [
    { value: 1, label: 'P1 - Pilne', color: 'bg-red-500' },
    { value:  2, label: 'P2 - Wysokie', color: 'bg-orange-500' },
    { value: 3, label: 'P3 - Normalne', color: 'bg-blue-500' },
    { value: 4, label: 'P4 - Niskie', color: 'bg-gray-400' }
  ]
  
  const quickDates = [
    { label: 'Dziś', value: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Jutro', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'Za 3 dni', value: format(addDays(new Date(), 3), 'yyyy-MM-dd') },
    { label: 'Za tydzień', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') }
  ]
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nowe Zadanie</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tytuł zadania <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co trzeba zrobić?"
              className={errors.title ? 'border-red-500' : ''}
              disabled={loading}
              autoFocus
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Opis
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe szczegóły..."
              rows={4}
              disabled={loading}
            />
          </div>
          
          {/* Grid Layout for 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <CalendarBlank size={18} />
                Data wykonania
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target. value)}
                className={errors. dueDate ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{errors. dueDate}</p>
              )}
              
              {/* Quick date buttons */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {quickDates.map(qd => (
                  <button
                    key={qd. label}
                    type="button"
                    onClick={() => setDueDate(qd.value)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
                    disabled={loading}
                  >
                    {qd.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Flag size={18} />
                Priorytet
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value as 1 | 2 | 3 | 4)}
                    className={`px-3 py-2 rounded-lg border-2 transition text-sm font-medium ${
                      priority === opt.value
                        ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                      {opt.label. split(' - ')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Project */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <FolderOpen size={18} />
                Projekt
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus: ring-2 focus:ring-brand-purple"
                disabled={loading}
              >
                <option value="">Brak projektu</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            {/* Estimated Time */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock size={18} />
                Estymacja (minuty)
              </label>
              <Input
                type="number"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="5"
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Labels */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Tag size={18} />
              Etykiety (oddzielone przecinkami)
            </label>
            <Input
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="praca, pilne, spotkanie"
              disabled={loading}
            />
          </div>
        </form>
        
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Tworzenie...
              </>
            ) : (
              'Utwórz zadanie'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
