'use client'

import React, { useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Textarea } from '../ui'

interface DecisionFormProps {
  onSubmit: (data: { title: string; description?: string; context?: string }) => void
  onCancel: () => void
}

export default function DecisionForm({ onSubmit, onCancel }: DecisionFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [context, setContext] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        context: context.trim() || undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="p-2"
            >
              <ArrowLeft />
            </Button>
            <CardTitle className="text-2xl">Nowa decyzja</CardTitle>
          </div>
          <CardDescription>
            Opisz decyzję, którą musisz podjąć. AI pomoże Ci przeanalizować opcje.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Tytuł decyzji <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Zmiana pracy, przeprowadzka, zakup samochodu"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Opis
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opisz szczegółowo sytuację i co jest dla Ciebie ważne w tej decyzji"
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="context" className="block text-sm font-medium mb-2">
              Dodatkowy kontekst
            </label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Dodaj wszelkie inne informacje, które mogą być pomocne (np. termin decyzji, ograniczenia, priorytety)"
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? 'Tworzę...' : 'Utwórz decyzję'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
