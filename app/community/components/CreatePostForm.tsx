'use client'

import { useState } from 'react'
import { createPost } from '../actions'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'

export function CreatePostForm() {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!content.trim()) {
      setError('Treść posta nie może być pusta')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createPost(content, isAnonymous)
      
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
          <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-2">
            Co dziś leży Ci na głowie?
          </label>
          <Textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Podziel się swoimi myślami..."
            className="w-full min-h-[120px] resize-none"
            maxLength={2000}
            disabled={isSubmitting}
          />
          <div className="mt-1 text-sm text-gray-500 text-right">
            {content.length} / 2000
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
              Opublikuj anonimowo
            </span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-6"
          >
            {isSubmitting ? 'Publikowanie...' : 'Opublikuj'}
          </Button>
        </div>
      </form>
    </div>
  )
}
