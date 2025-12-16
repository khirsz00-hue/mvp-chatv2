'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Heart, ChatCircle } from '@phosphor-icons/react'
import { likePost } from '../../actions'

interface Post {
  id: string
  created_at: string
  content: string
  like_count: number
  comment_count: number
  is_anonymous: boolean
  isLiked: boolean
}

interface PostDetailProps {
  post: Post
}

export function PostDetail({ post }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async () => {
    if (isLiking) return
    
    setIsLiking(true)
    const newLikedState = !isLiked
    const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1
    
    // Optimistic update
    setIsLiked(newLikedState)
    setLikeCount(newLikeCount)
    
    try {
      const result = await likePost(post.id)
      
      if (result.error) {
        // Revert on error
        setIsLiked(!newLikedState)
        setLikeCount(likeCount)
      }
    } catch (err) {
      // Revert on error
      setIsLiked(!newLikedState)
      setLikeCount(likeCount)
    } finally {
      setIsLiking(false)
    }
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: pl
  })

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-8">
      <div className="flex items-start gap-4">
        {/* Anonymous avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium">
            {post.is_anonymous ? '?' : 'U'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-medium text-gray-900">
              {post.is_anonymous ? 'Anonimowy użytkownik' : 'Użytkownik'}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-sm text-gray-500">{timeAgo}</span>
          </div>

          {/* Content */}
          <p className="text-gray-900 text-lg whitespace-pre-wrap break-words mb-6">
            {post.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors disabled:opacity-50"
              aria-label={isLiked ? 'Usuń wsparcie' : 'Wspieram'}
            >
              <Heart
                size={24}
                weight={isLiked ? 'fill' : 'regular'}
                className={isLiked ? 'text-pink-500' : ''}
              />
              <span className="font-medium">
                {likeCount > 0 ? `${likeCount} wsparć` : 'Wspieram'}
              </span>
            </button>

            <div className="flex items-center gap-2 text-gray-600">
              <ChatCircle size={24} weight="regular" />
              <span className="font-medium">
                {post.comment_count > 0 ? `${post.comment_count} komentarzy` : 'Brak komentarzy'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
