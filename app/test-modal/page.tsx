'use client'

import { useState } from 'react'
import { UniversalTaskModal, TaskData } from '@/components/common/UniversalTaskModal-new'
import Button from '@/components/ui/Button'

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  
  const mockTask: TaskData = {
    id: 'test-123',
    content: 'Przykładowe zadanie do edycji',
    description: 'To jest przykładowy opis zadania, który pokazuje jak wygląda edycja istniejącego zadania.',
    estimated_minutes: 45,
    cognitive_load: 3,
    project_id: '',
    priority: 2,
    due: '2026-03-01',
    labels: ['praca', 'ważne']
  }
  
  const handleSave = async (taskData: TaskData) => {
    console.log('Task saved:', taskData)
    setIsOpen(false)
    setIsEditOpen(false)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Test Modalu Zadań</h1>
        <p className="text-gray-600 mb-8">
          Testowa strona dla nowego ADHD-friendly designu modalu zadań
        </p>
        
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Tryb dodawania (nowe zadanie)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Kliknij aby otworzyć modal w trybie dodawania nowego zadania
            </p>
            <Button onClick={() => setIsOpen(true)}>
              Otwórz modal - Dodaj zadanie
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Tryb edycji (istniejące zadanie)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Kliknij aby otworzyć modal w trybie edycji z wypełnionymi danymi
            </p>
            <Button onClick={() => setIsEditOpen(true)}>
              Otwórz modal - Edytuj zadanie
            </Button>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h3 className="font-semibold mb-2 text-purple-900">✨ Kluczowe zmiany:</h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>✅ Slider dla czasu (zamiast 8 przycisków)</li>
              <li>✅ Single column layout (lepsza czytelność)</li>
              <li>✅ AI Understanding zawsze widoczny (gdy jest content)</li>
              <li>✅ Mobile: bottom tabs dla advanced features</li>
              <li>✅ Desktop: collapsible sections (bez zmian)</li>
              <li>✅ Przycisk &quot;Dodaj&quot; zamiast &quot;Utwórz&quot;</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-900">📱 Test na mobile:</h3>
            <p className="text-sm text-blue-800">
              Zmień szerokość okna przeglądarki na &lt;640px lub użyj DevTools
              aby zobaczyć mobile bottom tabs (Subtaski, Czas, Historia)
            </p>
          </div>
        </div>
      </div>
      
      <UniversalTaskModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onSave={handleSave}
      />
      
      <UniversalTaskModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={mockTask}
        onSave={handleSave}
      />
    </div>
  )
}
