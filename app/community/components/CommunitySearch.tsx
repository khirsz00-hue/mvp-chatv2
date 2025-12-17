'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlass, Tag as TagIcon, XCircle } from '@phosphor-icons/react'
import Input from '@/components/ui/Input'
import { TAG_DEFINITIONS } from '../tagDefinitions'

const QUICK_TAGS = TAG_DEFINITIONS.map(({ tag, label }) => ({ value: tag, label }))

export function CommunitySearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams?.get('q') || '')
  const [activeTag, setActiveTag] = useState(searchParams?.get('tag') || '')

  useEffect(() => {
    setQuery(searchParams?.get('q') || '')
    setActiveTag(searchParams?.get('tag') || '')
  }, [searchParams])

  const buildAndPushUrl = (nextQuery: string, nextTag: string) => {
    const params = new URLSearchParams()
    if (nextQuery.trim()) {
      params.set('q', nextQuery.trim())
    }
    if (nextTag) {
      params.set('tag', nextTag)
    }

    const search = params.toString()
    router.push(`/community${search ? `?${search}` : ''}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buildAndPushUrl(query, activeTag)
  }

  const handleTagClick = (tagValue: string) => {
    const nextTag = activeTag === tagValue ? '' : tagValue
    setActiveTag(nextTag)
    buildAndPushUrl(query, nextTag)
  }

  const handleClear = () => {
    setQuery('')
    setActiveTag('')
    router.push('/community')
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Znajdź konkretny wątek</p>
          <p className="text-sm text-gray-600">
            Posty są automatycznie tagowane (np. leki, prokrastynacja, depresja). Użyj słów kluczowych lub wybierz tag.
          </p>
        </div>
        {(query || activeTag) && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <XCircle size={16} weight="duotone" />
            Wyczyść
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700" htmlFor="community-search">
          Szukaj po treści lub tagach
        </label>
        <div className="relative">
          <Input
            id="community-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="np. leki na ADHD, prokrastynacja, niska motywacja..."
            className="pr-10"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-700"
            aria-label="Szukaj"
          >
            <MagnifyingGlass size={20} weight="bold" />
          </button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <TagIcon size={18} />
          Szybkie filtry
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onClick={() => handleTagClick(tag.value)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors ${
                activeTag === tag.value
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              #{tag.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
