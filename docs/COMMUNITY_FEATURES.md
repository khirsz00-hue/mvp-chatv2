# Community Module - Features Overview

## 🎯 Core Principles

This community module was designed specifically for people with ADHD, following these key principles:

### ✅ What This Module DOES:
- **Anonymous by Default** - Reduce social pressure
- **Chronological Feed** - No algorithmic manipulation
- **Simple Support System** - Heart icon for support signals
- **Helper Recognition** - Acknowledge supportive members without competition
- **Clean, Calm UI** - No dopamine-triggering gamification

### ❌ What This Module Does NOT Do:
- **No Rankings** - Posts never sorted by popularity
- **No Badges** - No achievement systems
- **No Levels** - No progression mechanics
- **No Leaderboards** - No public helper rankings
- **No Popularity Feeds** - No "trending" or "hot" sections
- **No AI Responses** - Human-to-human support only
- **No Automatic Comments** - All interactions are genuine

## 📱 User Interface

### Main Community Feed (`/community`)

```
┌─────────────────────────────────────────────────────────┐
│ Społeczność ADHD                                        │
│ Miejsce wsparcia dla osób z ADHD                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Co dziś leży Ci na głowie?                      │   │
│ │ [Textarea for new post]                          │   │
│ │                                             1000/2000│   │
│ │ ☐ Opublikuj anonimowo    [Opublikuj]          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 👤 Anonimowy użytkownik • 5 minut temu         │   │
│ │                                                  │   │
│ │ Dzisiaj czuję się przytłoczony wszystkimi...    │   │
│ │                                                  │   │
│ │ ❤️ 3 Wspieram    💬 2 Komentarze               │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [More posts...]                                         │
└─────────────────────────────────────────────────────────┘
```

**Sidebar: Często wspierający**
```
┌──────────────────────────┐
│ 🫶 Często wspierający    │
├──────────────────────────┤
│ W tej przestrzeni są     │
│ osoby, które często      │
│ wspierają innych         │
│                          │
│ 1️⃣ Wspierający #1  🫶   │
│ 2️⃣ Wspierający #2  🫶   │
│ 3️⃣ Wspierający #3  🫶   │
│ 4️⃣ Wspierający #4  🫶   │
│ 5️⃣ Wspierający #5  🫶   │
│                          │
│ Brak rankingów, brak     │
│ presji — wspieramy się   │
│ wzajemnie                │
└──────────────────────────┘
```

### Post Details Page (`/community/[postId]`)

```
┌─────────────────────────────────────────────────────────┐
│ ← Wróć do społeczności                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 👤 Anonimowy użytkownik • 1 godzinę temu       │   │
│ │                                                  │   │
│ │ Dzisiaj czuję się przytłoczony wszystkimi...    │   │
│ │ [Full post content]                              │   │
│ │                                                  │   │
│ │ ─────────────────────────────────────────────  │   │
│ │ ❤️ 5 wsparć    💬 3 komentarzy                 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Komentarze (3)                                          │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Dodaj komentarz                                  │   │
│ │ [Textarea]                                       │   │
│ │ ☐ Komentuj anonimowo    [Dodaj komentarz]      │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 👤 Anonimowy użytkownik • 30 minut temu        │   │
│ │                                                  │   │
│ │ Rozumiem Cię! Czasami też tak się czuję...      │   │
│ │                                                  │   │
│ │ ❤️ 2 Wspieram                                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [More comments...]                                      │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Technical Features

### Server Actions
1. **createPost** - Creates new post with content validation
2. **createComment** - Adds comment to post
3. **likePost** - Toggle like on post (optimistic UI)
4. **likeComment** - Toggle like on comment (optimistic UI, updates helper score)
5. **getPosts** - Fetch posts with user's like status
6. **getPost** - Fetch single post with all comments
7. **getRandomHelpers** - Get random helpers for sidebar

### Database Triggers
- **Auto-update comment count** - When comments are added/deleted
- **Auto-update like count** - When likes are added/removed
- **Auto-update helper scores** - When comment receives a like (+1 point)

### Security Features
- ✅ Row Level Security (RLS) on all tables
- ✅ Authentication required for all actions
- ✅ Users cannot see author_id of others
- ✅ Content length validation (2000 chars posts, 1000 chars comments)
- ✅ Server-side validation of all mutations

### UI/UX Features
- ✅ Optimistic UI updates (instant feedback)
- ✅ Error handling with rollback
- ✅ Relative time display (e.g., "5 minut temu")
- ✅ Character counters
- ✅ Responsive design (mobile-friendly)
- ✅ Accessibility labels
- ✅ Loading states

## 🎨 Design Language

### Colors
- **Purple/Pink gradient** - Brand colors for cards and buttons
- **Teal accent** - Community icon color
- **Soft backgrounds** - White/80% opacity with backdrop blur
- **Pink for likes** - Heart icon support signal

### Typography
- **Headings** - Bold, clear hierarchy
- **Body text** - Readable, good contrast
- **Timestamps** - Muted gray for non-intrusive info

### Spacing
- **Generous padding** - Reduces visual clutter
- **Clear separation** - Cards have clear boundaries
- **Consistent gaps** - 4-6 spacing units between elements

## 📊 Data Flow

### Creating a Post
```
User Input → CreatePostForm
           → Server Action (createPost)
           → Supabase Insert (with RLS)
           → Revalidate Path
           → UI Update (automatic)
```

### Liking a Comment
```
User Click → CommentCard
          → Optimistic Update (instant UI)
          → Server Action (likeComment)
          → Supabase Insert/Delete
          → Trigger: Update like_count
          → Trigger: Update helper_scores (+1)
          → Revalidate Path
          → Error Handling (rollback if failed)
```

## 🚀 Performance

### Optimization Strategies
- **Server Components** - Posts fetched on server, minimal client JS
- **Optimistic Updates** - Instant feedback while server processes
- **Indexed Queries** - Fast lookups via database indexes
- **Limit Queries** - Default 50 posts to prevent over-fetching
- **Minimal Re-renders** - Client components are focused and small

### Load Times
- **Initial page** - Server-rendered, fast first paint
- **Post creation** - Optimistic, feels instant
- **Like action** - Optimistic, feels instant
- **Navigation** - Next.js prefetching

## 🔐 Privacy & Safety

### User Privacy
- **Anonymous by default** - Low barrier to participation
- **No author reveal** - author_id never exposed to clients
- **No tracking** - No analytics on individual behavior
- **No emails** - No notification spam

### Content Safety
- **Status field** - Admins can hide/report content
- **Manual moderation** - Human review for reports
- **No automated actions** - No AI censorship

### Future Moderation Features (Not Implemented)
- Report button for users
- Admin dashboard for content review
- Automated spam detection (optional)

## 📈 Metrics & Analytics

### What We Track (Ethically)
- Post count (aggregate)
- Comment count (aggregate)
- Helper scores (for random display)
- Like counts (for support signals)

### What We DON'T Track
- Individual user behavior
- Time spent reading
- Click patterns
- Popularity metrics for ranking

## 🌟 Success Metrics

The community is successful when:
1. ✅ Users feel safe to share
2. ✅ Support is given and received
3. ✅ No one feels pressured to perform
4. ✅ Content is genuine and helpful
5. ✅ Community self-moderates positively

## 🤝 Community Guidelines (Suggested)

To maintain a supportive environment:

1. **Be Kind** - Support, don't judge
2. **Be Anonymous** - No pressure to reveal identity
3. **Be Genuine** - Share real experiences
4. **Be Respectful** - Everyone's ADHD is different
5. **Be Helpful** - Offer support when you can

## 🔮 Future Enhancements (Not in Current Scope)

Potential additions for future versions:

- **Edit/Delete** - Users can edit/delete their own posts
- **Report System** - Users can flag inappropriate content
- **Admin Dashboard** - Better moderation tools
- **Tag System** - Optional topic tags (without ranking)
- **Opt-in Notifications** - Email notifications for replies
- **Bookmarks** - Save posts for later (personal only)
- **Accessibility** - Screen reader improvements
- **Mobile App** - Native mobile experience

## ✨ Closing Thoughts

This community module prioritizes **mental health** over **engagement metrics**. It's designed to be:

- A **safe space** for vulnerability
- A **pressure-free zone** for sharing
- A **genuine community** of mutual support
- An **antidote** to toxic social media patterns

The success of this module isn't measured in likes, shares, or time-on-site. It's measured in genuine human connection and mutual support.
