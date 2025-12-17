'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Heart, ChatCircle } from '@phosphor-icons/react'
import { likePost } from '../actions'
import { generateNickname, getNicknameInitials } from '@/utils/nickname'

interface Post {
  id: string
  created_at: string
  content: string
  like_count: number
  comment_count: number
  is_anonymous: boolean
  isLiked: boolean
  author_id?: string | null
  tags?: string[] | null
}

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [isLiking, setIsLiking] = useState(false)
  const nickname = generateNickname(post.author_id)
  const initials = getNicknameInitials(nickname)
  const tags = (post.tags || []).filter(Boolean)

  const formatTag = (tag: string) => tag.replace(/-/g, ' ')

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
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

  const handleCardClick = () => {
    router.push(`/community/${post.id}`)
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: pl
  })

  return (
    <div
      onClick={handleCardClick}
      className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Anonymous avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-medium">
            {initials}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              {post.is_anonymous ? 'Anonimowy głos' : 'Członek społeczności'}
            </span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm font-medium text-purple-700 truncate">
              {nickname}
            </span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{timeAgo}</span>
          </div>

          {/* Content */}
          <p className="text-gray-900 whitespace-pre-wrap break-words mb-4">
            {post.content}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1"
                >
                  #{formatTag(tag)}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors disabled:opacity-50"
              aria-label={isLiked ? 'Usuń wsparcie' : 'Wspieram'}
            >
              <Heart
                size={20}
                weight={isLiked ? 'fill' : 'regular'}
                className={isLiked ? 'text-pink-500' : ''}
              />
              <span className="text-sm font-medium">
                {likeCount > 0 ? likeCount : 'Wspieram'}
              </span>
            </button>

            <button
              onClick={handleCardClick}
              className="flex items-center gap-2 text-gray-600 hover:text-purple-500 transition-colors"
              aria-label="Zobacz komentarze"
            >
              <ChatCircle size={20} weight="regular" />
              <span className="text-sm font-medium">
                {post.comment_count > 0 ? `${post.comment_count} komentarzy` : 'Komentarze'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
