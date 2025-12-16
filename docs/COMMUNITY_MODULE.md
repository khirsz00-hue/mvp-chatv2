# Community Module - ADHD Support Wall

## Overview

The Community Module is a safe, supportive space for people with ADHD to share their thoughts, provide mutual support, and connect with others who understand their challenges.

## Key Features

✅ **Anonymous by Default** - Posts and comments are anonymous by default, creating a pressure-free environment
✅ **Chronological Feed** - Posts appear in time order (newest first), no algorithmic ranking
✅ **Simple Interactions** - Like posts and comments as a signal of support
✅ **Helper Recognition** - Random display of frequently supportive users (no leaderboards)
✅ **Clean UI** - Calm, unobtrusive design without gamification

## Architecture

### Database Tables

The module uses 4 main tables:

#### `posts`
- `id` - UUID primary key
- `created_at` - Timestamp
- `author_id` - UUID (nullable, references auth.users)
- `is_anonymous` - Boolean (default: true)
- `content` - Text content of the post
- `like_count` - Integer counter
- `comment_count` - Integer counter
- `status` - Enum: 'active' | 'hidden' | 'reported'

#### `comments`
- `id` - UUID primary key
- `post_id` - UUID (references posts)
- `created_at` - Timestamp
- `author_id` - UUID (nullable, references auth.users)
- `is_anonymous` - Boolean (default: true)
- `content` - Text content
- `like_count` - Integer counter
- `status` - Enum: 'active' | 'hidden' | 'reported'

#### `likes`
- `id` - UUID primary key
- `user_id` - UUID (references auth.users)
- `target_type` - Enum: 'post' | 'comment'
- `target_id` - UUID
- `created_at` - Timestamp
- UNIQUE constraint on (user_id, target_type, target_id)

#### `helper_scores`
- `user_id` - UUID primary key (references auth.users)
- `score` - Integer (default: 0)
- `updated_at` - Timestamp

### Row Level Security (RLS)

All tables have RLS enabled:

- **Posts & Comments**: Anyone authenticated can read active posts/comments, create their own, and update their own
- **Likes**: Users can read all likes, create their own, and delete their own
- **Helper Scores**: Anyone can read, system can update (via triggers)

### Automatic Triggers

- **Comment Count**: Automatically updates post comment_count when comments are added/removed
- **Like Count & Helper Scores**: Automatically updates like_count on posts/comments and increments helper_scores when comment likes are added

## Server Actions

Located in `/app/community/actions.ts`:

### `createPost(content, isAnonymous)`
Creates a new post in the community.

### `createComment(postId, content, isAnonymous)`
Creates a comment on a specific post.

### `likePost(postId)`
Toggles like on a post (like if not liked, unlike if already liked).

### `likeComment(commentId, postId)`
Toggles like on a comment (like if not liked, unlike if already liked).

### `getPosts(limit)`
Fetches the latest posts with user's like status.

### `getPost(postId)`
Fetches a single post with all its comments and like statuses.

### `getRandomHelpers(limit)`
Fetches random users with helper scores > 0 for the sidebar.

## UI Components

### Main Feed (`/app/community/page.tsx`)
- **CreatePostForm** - Textarea to create new posts with anonymous checkbox
- **CommunityFeed** - List of post cards in chronological order
- **HelpersSidebar** - Shows random frequently supportive users

### Post Details (`/app/community/[postId]/page.tsx`)
- **PostDetail** - Full post with like/comment actions
- **CreateCommentForm** - Form to add comments
- **CommentsList** - List of all comments with like actions

## Design Principles

1. **No Ranking**: Posts are chronologically ordered, never by popularity
2. **No Gamification**: No badges, levels, or competitive elements
3. **Anonymous First**: Default to anonymous to reduce social pressure
4. **Simple Support**: Heart icon for support (not popularity)
5. **Calm UI**: Soft colors, minimal animations, no notifications

## Setup Instructions

### 1. Database Migration

Run the migration file to create tables:

```sql
-- Run the migration in Supabase SQL Editor or via CLI
psql $DATABASE_URL < supabase/migrations/20231216_community_module.sql
```

Or apply the schema from `schema.sql` which includes the community tables.

### 2. Navigation

The community is already integrated into the sidebar navigation with the Users icon.

### 3. Access

Navigate to `/community` to view the community feed. All authenticated users have access.

## Content Moderation

Posts and comments have a `status` field:
- `active` - Visible to all users
- `hidden` - Hidden from view (admin action)
- `reported` - Flagged for review (future feature)

Admin controls can be added to change post/comment status.

## Future Enhancements

Potential future additions (not in current implementation):
- Report button for inappropriate content
- Admin moderation dashboard
- Email notifications for replies (opt-in)
- Tag system for topics (without ranking)
- Edit/delete own posts/comments

## Security Considerations

- All database operations use RLS policies
- Users cannot see author_id of others
- Server actions validate authentication
- Content length limits prevent abuse
- Optimistic UI updates with error rollback

## Technical Notes

- Uses Next.js App Router with Server Components
- Server Actions for mutations
- Optimistic UI updates for better UX
- date-fns for relative time display
- Phosphor Icons for consistent iconography
