'use server'

import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'
import { revalidatePath } from 'next/cache'
import { TAG_DEFINITIONS } from './tagDefinitions'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

const NORMALIZED_TAG_DEFINITIONS = TAG_DEFINITIONS.map(def => ({
  ...def,
  keywords: def.keywords.map(normalizeText),
  patterns: def.keywords.map(keyword => new RegExp(`\\b${escapeRegExp(normalizeText(keyword))}\\b`))
}))

function slugifyTagValue(value: string) {
  if (!value || !value.trim()) return ''
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function generatePostTags(content: string) {
  const normalizedContent = normalizeText(content)
  const detected = new Set<string>()

  for (const { tag, patterns } of NORMALIZED_TAG_DEFINITIONS) {
    const match = patterns.some(pattern => pattern.test(normalizedContent))
    if (match) {
      detected.add(tag)
    }
  }

  return Array.from(detected)
}

/**
 * Create a new post in the community
 */
export async function createPost(content: string, isAnonymous: boolean = true) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return { error: 'Musisz być zalogowany, aby utworzyć post' }
    }

    if (!content || content.trim().length === 0) {
      return { error: 'Treść posta nie może być pusta' }
    }

    if (content.length > 2000) {
      return { error: 'Post nie może być dłuższy niż 2000 znaków' }
    }

    const trimmedContent = content.trim()
    const tags = generatePostTags(trimmedContent)

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content: trimmedContent,
        tags,
        is_anonymous: isAnonymous,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return { error: 'Nie udało się utworzyć posta' }
    }

    revalidatePath('/community')
    return { data }
  } catch (error) {
    console.error('Unexpected error creating post:', error)
    return { error: 'Wystąpił nieoczekiwany błąd' }
  }
}

/**
 * Create a comment on a post
 */
export async function createComment(postId: string, content: string, isAnonymous: boolean = true) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return { error: 'Musisz być zalogowany, aby dodać komentarz' }
    }

    if (!content || content.trim().length === 0) {
      return { error: 'Treść komentarza nie może być pusta' }
    }

    if (content.length > 1000) {
      return { error: 'Komentarz nie może być dłuższy niż 1000 znaków' }
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: content.trim(),
        is_anonymous: isAnonymous,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return { error: 'Nie udało się dodać komentarza' }
    }

    revalidatePath('/community')
    revalidatePath(`/community/${postId}`)
    return { data }
  } catch (error) {
    console.error('Unexpected error creating comment:', error)
    return { error: 'Wystąpił nieoczekiwany błąd' }
  }
}

/**
 * Like a post
 */
export async function likePost(postId: string) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return { error: 'Musisz być zalogowany, aby polubić post' }
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .single()

    if (existingLike) {
      // Unlike - remove the like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', 'post')
        .eq('target_id', postId)

      if (error) {
        console.error('Error removing like:', error)
        return { error: 'Nie udało się usunąć polubienia' }
      }

      revalidatePath('/community')
      revalidatePath(`/community/${postId}`)
      return { data: { liked: false } }
    } else {
      // Like - add new like
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          target_type: 'post',
          target_id: postId
        })

      if (error) {
        console.error('Error adding like:', error)
        return { error: 'Nie udało się polubić posta' }
      }

      revalidatePath('/community')
      revalidatePath(`/community/${postId}`)
      return { data: { liked: true } }
    }
  } catch (error) {
    console.error('Unexpected error liking post:', error)
    return { error: 'Wystąpił nieoczekiwany błąd' }
  }
}

/**
 * Like a comment
 */
export async function likeComment(commentId: string, postId: string) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return { error: 'Musisz być zalogowany, aby polubić komentarz' }
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'comment')
      .eq('target_id', commentId)
      .single()

    if (existingLike) {
      // Unlike - remove the like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', 'comment')
        .eq('target_id', commentId)

      if (error) {
        console.error('Error removing like:', error)
        return { error: 'Nie udało się usunąć polubienia' }
      }

      revalidatePath(`/community/${postId}`)
      return { data: { liked: false } }
    } else {
      // Like - add new like
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          target_type: 'comment',
          target_id: commentId
        })

      if (error) {
        console.error('Error adding like:', error)
        return { error: 'Nie udało się polubić komentarza' }
      }

      revalidatePath(`/community/${postId}`)
      return { data: { liked: true } }
    }
  } catch (error) {
    console.error('Unexpected error liking comment:', error)
    return { error: 'Wystąpił nieoczekiwany błąd' }
  }
}

/**
 * Fetch posts for the community feed (chronologically)
 */
export async function getPosts(options: { limit?: number; search?: string; tag?: string } = {}) {
  try {
    const { limit = 50, search, tag } = options
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return { error: 'Musisz być zalogowany, aby przeglądać posty' }
    }

    const buildBaseQuery = () =>
      supabase
        .from('posts')
        .select('*')
        .eq('status', 'active')

    const tagFilter = tag ? slugifyTagValue(tag) : ''
    const hasSearch = !!(search && search.trim())

    let posts = []
    let queryError = null as any

    if (hasSearch) {
      const safeSearch = search.trim()
      const sanitized = safeSearch
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
      const normalizedTagTerm = slugifyTagValue(sanitized)

      if (normalizedTagTerm) {
        const perQueryLimit = Math.max(1, Math.ceil(limit / 2))
        const [contentResult, tagResult] = await Promise.all([
          buildBaseQuery()
            .ilike('content', `%${sanitized}%`)
            .order('created_at', { ascending: false })
            .limit(perQueryLimit),
          buildBaseQuery()
            .contains('tags', [normalizedTagTerm])
            .order('created_at', { ascending: false })
            .limit(perQueryLimit)
        ])

        queryError = contentResult.error || tagResult.error
        const merged = [...(contentResult.data || []), ...(tagResult.data || [])]
        const seen = new Set<string>()
        posts = merged.filter(post => {
          if (seen.has(post.id)) return false
          seen.add(post.id)
          return true
        })
        posts = posts
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit)
      } else {
        const { data, error } = await buildBaseQuery()
          .ilike('content', `%${sanitized}%`)
          .order('created_at', { ascending: false })
          .limit(limit)
        queryError = error
        posts = data || []
      }
    } else if (tagFilter) {
      const { data, error } = await buildBaseQuery()
        .contains('tags', [tagFilter])
        .order('created_at', { ascending: false })
        .limit(limit)
      queryError = error
      posts = data || []
    } else {
      const { data, error } = await buildBaseQuery()
        .order('created_at', { ascending: false })
        .limit(limit)
      queryError = error
      posts = data || []
    }

    if (queryError) {
      console.error('Error fetching posts:', queryError)
      return { error: 'Nie udało się pobrać postów' }
    }

    if (!posts || posts.length === 0) {
      return { data: [] }
    }

    // Get user's likes for these posts
    const postIds = posts.map(p => p.id)
    const { data: userLikes } = await supabase
      .from('likes')
      .select('target_id')
      .eq('user_id', user.id)
      .eq('target_type', 'post')
      .in('target_id', postIds)

    const likedPostIds = new Set(userLikes?.map(l => l.target_id) || [])

    // Add liked status to posts
    const postsWithLikes = posts.map(post => ({
      ...post,
      tags: post.tags || [],
      isLiked: likedPostIds.has(post.id)
    }))

    return { data: postsWithLikes }
  } catch (error) {
    console.error('Unexpected error fetching posts:', error)
    return { error: 'Wystąpił nieoczekiwany błąd' }
  }
}

/**
 * Fetch a single post with its comments
 */
export async function getPost(postId: string) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return { error: 'Musisz być zalogowany, aby przeglądać posty' }
    }

    // Fetch post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('status', 'active')
      .single()

    if (postError) {
      console.error('Error fetching post:', postError)
      return { error: 'Nie udało się pobrać posta' }
    }

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return { error: 'Nie udało się pobrać komentarzy' }
    }

    // Get user's likes
    const { data: postLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .single()

    const commentIds = comments.map(c => c.id)
    let likedCommentIds = new Set<string>()

    if (commentIds.length > 0) {
      const { data: commentLikes } = await supabase
        .from('likes')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'comment')
        .in('target_id', commentIds)

      likedCommentIds = new Set(commentLikes?.map(l => l.target_id) || [])
    }

    // Add liked status
    const commentsWithLikes = comments.map(comment => ({
      ...comment,
      isLiked: likedCommentIds.has(comment.id)
    }))

    const postWithTags = { ...post, tags: post.tags || [] }

    return {
      data: {
        post: { ...postWithTags, isLiked: !!postLike },
        comments: commentsWithLikes
      }
    }
  } catch (error) {
    console.error('Unexpected error fetching post:', error)
    return { error: 'Wystąpił nieoczekiwany błąd' }
  }
}

/**
 * Get random helpers (users with high helper scores)
 */
export async function getRandomHelpers(limit: number = 5) {
  try {
    const supabase = await createAuthenticatedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return { error: 'Musisz być zalogowany' }
    }

    // Get helpers with score > 0, randomized
    const { data: helpers, error } = await supabase
      .from('helper_scores')
      .select('user_id, score')
      .gt('score', 0)
      .limit(limit * 3) // Get more than needed to randomize

    if (error || !helpers) {
      console.error('Error fetching helpers:', error)
      return { data: [] }
    }

    const helperIds = helpers.map(helper => helper.user_id)

    const buildCountMap = (items?: { author_id?: string | null }[]) =>
      (items || []).reduce<Record<string, number>>((acc, item) => {
        if (item.author_id) {
          acc[item.author_id] = (acc[item.author_id] ?? 0) + 1
        }
        return acc
      }, {})

    let postCounts: Record<string, number> = {}
    let commentCounts: Record<string, number> = {}

    if (helperIds.length > 0) {
      const [{ data: posts }, { data: comments }] = await Promise.all([
        supabase
          .from('posts')
          .select('author_id')
          .eq('status', 'active')
          .in('author_id', helperIds),
        supabase
          .from('comments')
          .select('author_id')
          .eq('status', 'active')
          .in('author_id', helperIds)
      ])

      postCounts = buildCountMap(posts)
      commentCounts = buildCountMap(comments)
    }

    // Randomize and limit
    const randomHelpers = helpers
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)

    const helpersWithStats = randomHelpers.map(helper => ({
      user_id: helper.user_id,
      score: helper.score ?? 0,
      post_count: postCounts[helper.user_id] ?? 0,
      comment_count: commentCounts[helper.user_id] ?? 0
    }))

    return { data: helpersWithStats }
  } catch (error) {
    console.error('Unexpected error fetching helpers:', error)
    return { data: [] }
  }
}
