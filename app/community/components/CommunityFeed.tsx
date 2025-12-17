'use client'

import { PostCard } from './PostCard'

interface Post {
  id: string
  created_at: string
  content: string
  like_count: number
  comment_count: number
  is_anonymous: boolean
  isLiked: boolean
  author_id?: string | null
}

interface CommunityFeedProps {
  initialPosts: Post[]
}

export function CommunityFeed({ initialPosts }: CommunityFeedProps) {
  if (initialPosts.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-600 text-lg">
          Jeszcze nie ma żadnych postów. Bądź pierwszą osobą, która się podzieli swoimi myślami! ✨
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {initialPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
