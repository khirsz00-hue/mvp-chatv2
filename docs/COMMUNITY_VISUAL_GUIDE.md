# Community Module - Visual Guide

## 📂 File Structure

```
mvp-chatv2/
├── app/community/
│   ├── page.tsx                          # Main community feed
│   ├── actions.ts                        # Server actions (7 total)
│   ├── components/
│   │   ├── CreatePostForm.tsx           # Post creation form
│   │   ├── CommunityFeed.tsx            # Post list display
│   │   ├── PostCard.tsx                 # Individual post card
│   │   └── HelpersSidebar.tsx           # Helper recognition sidebar
│   └── [postId]/
│       ├── page.tsx                     # Post detail page
│       └── components/
│           ├── PostDetail.tsx           # Full post view
│           ├── CreateCommentForm.tsx    # Comment creation
│           ├── CommentsList.tsx         # Comment list wrapper
│           └── CommentCard.tsx          # Individual comment card
├── components/layout/
│   ├── Sidebar.tsx                      # Updated: Added community nav
│   └── MainLayout.tsx                   # Updated: Added community routing
├── supabase/migrations/
│   └── 20231216_community_module.sql    # Complete database migration
├── docs/
│   ├── COMMUNITY_MODULE.md              # Architecture docs
│   ├── COMMUNITY_SETUP.md               # Setup guide
│   ├── COMMUNITY_FEATURES.md            # Feature overview
│   └── COMMUNITY_VISUAL_GUIDE.md        # This file
├── schema.sql                            # Updated: Added community tables
└── COMMUNITY_IMPLEMENTATION_SUMMARY.md   # Complete summary
```

## 🗺️ Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Application                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                       Sidebar                           │    │
│  │  • Zadania                                             │    │
│  │  • Asystent Dnia                                       │    │
│  │  • Planowanie                                          │    │
│  │  • Dziennik                                            │    │
│  │  • Decyzje                                             │    │
│  │  👥 Społeczność  ← NEW! (Teal color)                  │    │
│  │  • Wsparcie                                            │    │
│  │  • Panel Admina (if admin)                            │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Click "Społeczność"
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    /community (Main Feed)                        │
│  ┌──────────────────────────────────┬─────────────────────────┐ │
│  │         Main Content             │    Helpers Sidebar      │ │
│  │                                  │                         │ │
│  │  [Create Post Form]              │  🫶 Często wspierający │ │
│  │  ┌────────────────────────────┐ │  ─────────────────────  │ │
│  │  │ Co dziś leży Ci na głowie? │ │  1️⃣ Wspierający #1 🫶  │ │
│  │  │ [Textarea]                  │ │  2️⃣ Wspierający #2 🫶  │ │
│  │  │ ☐ Anonimowo  [Opublikuj]  │ │  3️⃣ Wspierający #3 🫶  │ │
│  │  └────────────────────────────┘ │  4️⃣ Wspierający #4 🫶  │ │
│  │                                  │  5️⃣ Wspierający #5 🫶  │ │
│  │  [Post Card 1]                   │                         │ │
│  │  [Post Card 2]                   │  Brak rankingów,       │ │
│  │  [Post Card 3]                   │  brak presji           │ │
│  │  ...                             │                         │ │
│  └──────────────────────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Click on a Post Card
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              /community/[postId] (Post Details)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ← Wróć do społeczności                                  │  │
│  │                                                           │  │
│  │  [Full Post Details]                                     │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 👤 Anonimowy użytkownik • 1 godzinę temu         │  │  │
│  │  │ [Full post content...]                            │  │  │
│  │  │ ─────────────────────────────────────────────     │  │  │
│  │  │ ❤️ 5 wsparć    💬 3 komentarzy                   │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  Komentarze (3)                                          │  │
│  │  [Create Comment Form]                                   │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Dodaj komentarz                                   │  │  │
│  │  │ [Textarea]                                        │  │  │
│  │  │ ☐ Anonimowo  [Dodaj komentarz]                  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  [Comment Card 1]                                        │  │
│  │  [Comment Card 2]                                        │  │
│  │  [Comment Card 3]                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Component Breakdown

### Main Feed Components

#### CreatePostForm
```typescript
'use client'  // Interactive component
- Textarea for post content (max 2000 chars)
- Checkbox for anonymous posting (default: true)
- Character counter
- Submit button
- Optimistic error handling
```

#### PostCard
```typescript
'use client'  // Interactive for likes
- Anonymous avatar
- Author name (Anonymous or User)
- Timestamp (relative, e.g., "5 minut temu")
- Post content
- Like button (❤️) with count
- Comment button (💬) with count
- Optimistic like updates
- Click to navigate to detail page
```

#### HelpersSidebar
```typescript
'use client'  // Static display
- Shows 3-5 random helpers
- No scores displayed publicly
- No ranking numbers
- Friendly message about support
```

### Post Detail Components

#### PostDetail
```typescript
'use client'  // Interactive for likes
- Larger avatar
- Full post content
- Larger like/comment buttons
- Optimistic like updates
```

#### CreateCommentForm
```typescript
'use client'  // Interactive component
- Textarea for comment (max 1000 chars)
- Checkbox for anonymous (default: true)
- Character counter
- Submit button
```

#### CommentCard
```typescript
'use client'  // Interactive for likes
- Anonymous avatar (slightly different color)
- Author name
- Timestamp
- Comment content
- Like button with count
- Optimistic updates
```

## 🔄 Data Flow

### Creating a Post

```
User Types in CreatePostForm
           ↓
Clicks "Opublikuj"
           ↓
Client validates (non-empty, < 2000 chars)
           ↓
Calls createPost() server action
           ↓
Server validates authentication
           ↓
Server validates content
           ↓
Supabase INSERT with RLS check
           ↓
Revalidate /community path
           ↓
Form clears, new post appears at top
```

### Liking a Post

```
User Clicks ❤️ on PostCard
           ↓
Optimistic Update (instant UI change)
           ↓
Calls likePost() server action
           ↓
Server checks if already liked
           ↓
If liked: DELETE like
If not liked: INSERT like
           ↓
Trigger: Update post.like_count
           ↓
Revalidate paths
           ↓
If error: Rollback optimistic update
```

### Commenting on a Post

```
User Types in CreateCommentForm
           ↓
Clicks "Dodaj komentarz"
           ↓
Client validates
           ↓
Calls createComment() server action
           ↓
Server validates
           ↓
Supabase INSERT comment
           ↓
Trigger: Increment post.comment_count
           ↓
Revalidate paths
           ↓
Form clears, comment appears
```

### Liking a Comment

```
User Clicks ❤️ on CommentCard
           ↓
Optimistic Update
           ↓
Calls likeComment() server action
           ↓
Server processes like
           ↓
Trigger 1: Update comment.like_count
Trigger 2: Update helper_scores.score (+1)
           ↓
Revalidate paths
           ↓
Helper score updated in background
```

## 🗄️ Database Relationships

```
┌─────────────────┐
│   auth.users    │
│   (Supabase)    │
└────────┬────────┘
         │
         │ (references)
         │
    ┌────┴─────┬──────────────┬───────────────┐
    │          │              │               │
    ↓          ↓              ↓               ↓
┌───────┐  ┌──────────┐  ┌───────┐  ┌──────────────┐
│ posts │  │ comments │  │ likes │  │helper_scores │
└───┬───┘  └────┬─────┘  └───────┘  └──────────────┘
    │           │
    │           │ (post_id FK)
    └───────────┘

Triggers:
• comments INSERT/DELETE → updates posts.comment_count
• likes INSERT/DELETE → updates posts/comments.like_count
• likes INSERT on comment → updates helper_scores.score
```

## 🎯 User Interactions

### Anonymous User Flow

```
1. User logs in (required)
2. Navigates to Społeczność
3. Sees "Co dziś leży Ci na głowie?" form
4. Types their thoughts
5. Keeps "Opublikuj anonimowo" checked ✓
6. Clicks "Opublikuj"
7. Post appears as "Anonimowy użytkownik"
8. No one can see who posted it
9. User can still like and comment
```

### Helper Recognition Flow

```
1. User A posts a comment
2. User B likes the comment (❤️)
3. Database trigger fires
4. helper_scores table updated:
   - User A's score +1
5. Sidebar randomly shows helpers with score > 0
6. User A might appear as "Wspierający #3"
7. No score shown publicly (just "Wspierający #N")
8. List refreshes randomly each page load
9. No competitive element, just recognition
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────────┐
│           Client (Browser)                   │
│  • No author_id exposed                      │
│  • No admin functions available              │
│  • No direct database access                 │
└──────────────┬──────────────────────────────┘
               │
               │ HTTPS
               ↓
┌─────────────────────────────────────────────┐
│        Next.js Server Actions                │
│  • Validates authentication                  │
│  • Validates input length                    │
│  • Uses authenticated Supabase client        │
│  • Returns sanitized data only               │
└──────────────┬──────────────────────────────┘
               │
               │ Secure connection
               ↓
┌─────────────────────────────────────────────┐
│          Supabase Database                   │
│  • Row Level Security (RLS) enabled          │
│  • Policies check auth.uid()                 │
│  • FK constraints enforced                   │
│  • Triggers update counts automatically      │
└─────────────────────────────────────────────┘
```

## 🎨 Color Palette

```
Component               Color                    Usage
─────────────────────────────────────────────────────────
Community Icon         Teal (#14B8A6)          Sidebar navigation
Post Cards             White/80% + blur        Card backgrounds
Like Button (Active)   Pink (#EC4899)          Filled heart
Like Button (Hover)    Pink (#EC4899)          Text color
Avatar Gradient        Purple → Pink           Anonymous avatars
Comment Avatar         Lighter Purple→Pink     Slightly different
Button Primary         Purple (#9333EA)        Submit buttons
Text Primary           Gray-900 (#111827)      Main content
Text Secondary         Gray-600 (#4B5563)      Timestamps, labels
Text Muted             Gray-500 (#6B7280)      Helper text
Border                 Gray-200 (#E5E7EB)      Card borders
```

## 📐 Layout Dimensions

```
Desktop Layout (1024px+)
┌────────────────────────────────────────────────────────┐
│ Sidebar │          Main Content         │   Helpers   │
│  256px  │           flex-1              │    ~300px   │
│         │                               │             │
│ Fixed   │     Responsive Growth         │   Sticky    │
└────────────────────────────────────────────────────────┘

Mobile Layout (<1024px)
┌──────────────────────┐
│   Hamburger Menu     │
│   (Slides in/out)    │
├──────────────────────┤
│                      │
│    Main Content      │
│    (Full width)      │
│                      │
├──────────────────────┤
│   Helpers Sidebar    │
│   (Below content)    │
└──────────────────────┘
```

## 🔄 State Management

```
Server State (Database)
• Posts, Comments, Likes
• Helper Scores
• User Authentication

Server Actions
• Mutations (create, like)
• Queries (get posts, get post)

Client State (React)
• Form inputs (controlled)
• Optimistic updates (local)
• Loading states (per component)
• Error messages (per component)

No Global State Management Needed
✓ Server Components for data
✓ Server Actions for mutations
✓ Next.js caching for performance
```

## ✨ Animation & Feedback

```
Interaction          Feedback                    Timing
───────────────────────────────────────────────────────────
Like Button Click   • Instant color change       0ms (optimistic)
                    • Heart fills in             
                    • Count updates              

Form Submit         • Button disabled            0ms
                    • Text changes to           
                      "Publikowanie..."          
                    • Form clears on success    ~300ms

Card Hover          • Shadow increases           150ms transition
                    • Subtle lift effect        

Navigation          • Next.js prefetch          Instant
                    • Smooth transition         

Error               • Red text appears          0ms
                    • Inline with form          

Success             • New content appears       Revalidation
                    • Smooth scroll to top      
```

## 🎯 Success Indicators

### For Users
✅ Post created successfully → "Form clears, post at top"
✅ Comment added → "Form clears, comment appears"
✅ Like given → "Heart fills, count increments"
✅ Support received → "Seeing hearts on your content"

### For System
✅ RLS working → "Only authenticated users can access"
✅ Triggers working → "Counts update automatically"
✅ Helper scores → "Sidebar shows active helpers"
✅ No errors → "Smooth user experience"

---

**Quick Reference:**
- Main Feed: `/community`
- Post Details: `/community/[postId]`
- Server Actions: `app/community/actions.ts`
- Database: Tables `posts`, `comments`, `likes`, `helper_scores`
