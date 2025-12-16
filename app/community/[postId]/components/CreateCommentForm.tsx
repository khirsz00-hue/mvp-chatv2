'use client'

import { useState } from 'react'
import { createComment } from '../../actions'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface CreateCommentFormProps {
  postId: string
}

export function CreateCommentForm({ postId }: CreateCommentFormProps) {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!content.trim()) {
      setError('Treść komentarza nie może być pusta')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createComment(postId, content, isAnonymous)
      
      if (result.error) {
        setError(result.error)
      } else {
        setContent('')
        setError('')
      }
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="comment-content" className="block text-sm font-medium text-gray-700 mb-2">
            Dodaj komentarz
          </label>
          <Textarea
            id="comment-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Wyraź swoje wsparcie lub podziel się swoimi myślami..."
            className="w-full min-h-[100px] resize-none"
            maxLength={1000}
            disabled={isSubmitting}
          />
          <div className="mt-1 text-sm text-gray-500 text-right">
            {content.length} / 1000
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              disabled={isSubmitting}
            />
            <span className="text-sm text-gray-700">
              Komentuj anonimowo
            </span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-6"
          >
            {isSubmitting ? 'Dodawanie...' : 'Dodaj komentarz'}
          </Button>
        </div>
      </form>
    </div>
  )
}
