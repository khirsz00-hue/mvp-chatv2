import { notFound } from 'next/navigation'
import { getPost } from '../actions'
import { PostDetail } from './components/PostDetail'
import { CommentsList } from './components/CommentsList'
import { CreateCommentForm } from './components/CreateCommentForm'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'

export default async function PostDetailPage({ params }: { params: { postId: string } }) {
  const { postId } = params
  const result = await getPost(postId)

  if (result.error || !result.data) {
    notFound()
  }

  const { post, comments } = result.data

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/community"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        <span>Wróć do społeczności</span>
      </Link>

      {/* Post */}
      <div className="mb-6">
        <PostDetail post={post} />
      </div>

      {/* Comments section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Komentarze ({comments.length})
          </h2>
          <CreateCommentForm postId={postId} />
        </div>

        {comments.length > 0 && (
          <CommentsList comments={comments} postId={postId} />
        )}
      </div>
    </div>
  )
}
