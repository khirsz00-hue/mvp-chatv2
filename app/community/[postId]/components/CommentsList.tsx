'use client'

import { CommentCard } from './CommentCard'

interface Comment {
  id: string
  created_at: string
  content: string
  like_count: number
  is_anonymous: boolean
  isLiked: boolean
  author_id?: string | null
}

interface CommentsListProps {
  comments: Comment[]
  postId: string
}

export function CommentsList({ comments, postId }: CommentsListProps) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentCard key={comment.id} comment={comment} postId={postId} />
      ))}
    </div>
  )
}
