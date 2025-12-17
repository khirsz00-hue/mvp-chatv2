'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Heart } from '@phosphor-icons/react'
import { likeComment } from '../../actions'
import { generateNickname, getNicknameInitials } from '@/utils/nickname'

interface Comment {
  id: string
  created_at: string
  content: string
  like_count: number
  is_anonymous: boolean
  isLiked: boolean
  author_id?: string | null
}

interface CommentCardProps {
  comment: Comment
  postId: string
}

export function CommentCard({ comment, postId }: CommentCardProps) {
  const [isLiked, setIsLiked] = useState(comment.isLiked)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [isLiking, setIsLiking] = useState(false)
  const nickname = generateNickname(comment.author_id)
  const initials = getNicknameInitials(nickname)

  const handleLike = async () => {
    if (isLiking) return
    
    setIsLiking(true)
    const newLikedState = !isLiked
    const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1
    
    // Optimistic update
    setIsLiked(newLikedState)
    setLikeCount(newLikeCount)
    
    try {
      const result = await likeComment(comment.id, postId)
      
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

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: pl
  })

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        {/* Anonymous avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-medium">
            {initials}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              {comment.is_anonymous ? 'Anonimowy głos' : 'Członek społeczności'}
            </span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm font-medium text-purple-700 truncate">
              {nickname}
            </span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{timeAgo}</span>
          </div>

          {/* Content */}
          <p className="text-gray-900 whitespace-pre-wrap break-words mb-3">
            {comment.content}
          </p>

          {/* Actions */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors disabled:opacity-50"
            aria-label={isLiked ? 'Usuń wsparcie' : 'Wspieram'}
          >
            <Heart
              size={18}
              weight={isLiked ? 'fill' : 'regular'}
              className={isLiked ? 'text-pink-500' : ''}
            />
            <span className="text-sm font-medium">
              {likeCount > 0 ? likeCount : 'Wspieram'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
