/**
 * WorkHoursConfigModal Component
 * Modal for configuring work hours, AI instructions, and context categories
 */

'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { XCircle } from '@phosphor-icons/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { supabase } from '@/lib/supabaseClient'

interface WorkHoursConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: {
    work_start_time: string
    work_end_time: string
    ai_instructions: string
  }) => void
  initialConfig?: {
    work_start_time?: string
    work_end_time?: string
    ai_instructions?: string
  }
}

export function WorkHoursConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig
}: WorkHoursConfigModalProps) {
  const [activeTab, setActiveTab] = useState('hours')
  const [workStartTime, setWorkStartTime] = useState(
    initialConfig?.work_start_time || '09:00'
  )
  const [workEndTime, setWorkEndTime] = useState(
    initialConfig?.work_end_time || '17:00'
  )
  const [aiInstructions, setAiInstructions] = useState(
    initialConfig?.ai_instructions || ''
  )
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [loadingCategories, setLoadingCategories] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/day-assistant-v2/context-categories', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const { categories: fetchedCategories } = await response.json()
        setCategories(fetchedCategories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()])
      setNewCategory('')
    }
  }

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category))
  }

  const handleSaveCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/day-assistant-v2/context-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ categories })
      })
      
      if (response.ok) {
        alert('✅ Kategorie zaktualizowane! Zadania zostaną przekategoryzowane.')
        onClose()
      } else {
        alert('❌ Nie udało się zapisać kategorii')
      }
    } catch (error) {
      console.error('Failed to save categories:', error)
      alert('❌ Wystąpił błąd podczas zapisywania kategorii')
    }
  }

  const handleSave = () => {
    onSave({
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      ai_instructions: aiInstructions
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold">⚙️ Konfiguracja</h2>
          <button onClick={onClose}>
            <XCircle size={24} className="text-gray-500" />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="hours">Godziny pracy</TabsTrigger>
            <TabsTrigger value="categories">Kategorie kontekstu</TabsTrigger>
            <TabsTrigger value="instructions">Instrukcje AI</TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🕐 Godziny pracy
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Początek
                  </label>
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={e => setWorkStartTime(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Koniec
                  </label>
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={e => setWorkEndTime(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>
                ❌ Anuluj
              </Button>
              <Button onClick={handleSave}>
                💾 Zapisz
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <p className="text-sm text-gray-600">
              Zarządzaj kategoriami kontekstu dla swoich zadań. AI automatycznie przekategoryzuje wszystkie zadania po zapisaniu.
            </p>

            {loadingCategories ? (
              <p className="text-sm text-gray-500">Ładowanie kategorii...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold">Twoje kategorie:</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <div key={category} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md">
                        <span>{category}</span>
                        <button 
                          onClick={() => handleRemoveCategory(category)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nowa kategoria..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    className="flex-1 rounded-lg border px-3 py-2"
                  />
                  <Button onClick={handleAddCategory}>Dodaj</Button>
                </div>

                <Button onClick={handleSaveCategories} className="w-full">
                  💾 Zapisz kategorie
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💬 Dodatkowe instrukcje dla AI
              </label>
              <textarea
                value={aiInstructions}
                onChange={e => setAiInstructions(e.target.value)}
                placeholder="Dzisiaj pracuję tylko do 12:00, muszę iść do lekarza"
                className="w-full rounded-lg border px-3 py-2 min-h-[100px] resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>
                ❌ Anuluj
              </Button>
              <Button onClick={handleSave}>
                💾 Zapisz
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
