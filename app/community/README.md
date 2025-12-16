# Community Module

> A safe, supportive space for people with ADHD to share and receive support.

## 🚀 Quick Start

### For Users
Navigate to **Społeczność** in the sidebar to:
- Share what's on your mind
- Support others with ❤️
- Read and comment on posts
- All anonymous by default

### For Developers
```bash
# 1. Apply database migration
psql $DATABASE_URL < supabase/migrations/20231216_community_module.sql

# 2. Start dev server
npm run dev

# 3. Navigate to http://localhost:3000/community
```

## 📁 File Structure

```
app/community/
├── page.tsx                    # Main feed
├── actions.ts                  # Server actions
├── components/                 # Feed components
│   ├── CreatePostForm.tsx
│   ├── CommunityFeed.tsx
│   ├── PostCard.tsx
│   └── HelpersSidebar.tsx
└── [postId]/                   # Post details
    ├── page.tsx
    └── components/
        ├── PostDetail.tsx
        ├── CreateCommentForm.tsx
        ├── CommentsList.tsx
        └── CommentCard.tsx
```

## 🔧 Server Actions

```typescript
// In app/community/actions.ts
createPost(content, isAnonymous)      // Create new post
createComment(postId, content, isAnonymous)  // Add comment
likePost(postId)                      // Toggle post like
likeComment(commentId, postId)        // Toggle comment like
getPosts(limit)                       // Fetch posts
getPost(postId)                       // Fetch post + comments
getRandomHelpers(limit)               // Fetch helpers
```

## 🗄️ Database Tables

- **posts** - Community posts
- **comments** - Post comments
- **likes** - User likes on posts/comments
- **helper_scores** - Support recognition tracking

All tables have RLS enabled for security.

## 🎨 Design Principles

✅ **Anonymous by default** - Reduce social pressure  
✅ **Chronological feed** - No algorithmic ranking  
✅ **No gamification** - No badges or levels  
✅ **Simple support** - Heart for support signals  
✅ **ADHD-friendly** - Calm, unobtrusive UI  

## 📚 Documentation

- **[COMMUNITY_MODULE.md](../../docs/COMMUNITY_MODULE.md)** - Complete architecture
- **[COMMUNITY_SETUP.md](../../docs/COMMUNITY_SETUP.md)** - Setup guide
- **[COMMUNITY_FEATURES.md](../../docs/COMMUNITY_FEATURES.md)** - Feature overview
- **[COMMUNITY_VISUAL_GUIDE.md](../../docs/COMMUNITY_VISUAL_GUIDE.md)** - Visual diagrams
- **[COMMUNITY_IMPLEMENTATION_SUMMARY.md](../../COMMUNITY_IMPLEMENTATION_SUMMARY.md)** - Full summary

## 🔐 Security

- ✅ RLS policies on all tables
- ✅ Server-side authentication
- ✅ Content validation
- ✅ No exposed credentials
- ✅ No SQL injection vectors

## 🎯 Key Features

### For Users
- Create posts anonymously
- Comment on posts
- Like posts and comments
- See supportive community members

### For System
- Automatic comment counting
- Automatic like counting
- Helper score tracking
- Optimistic UI updates

## ⚡ Performance

- Server Components for initial render
- Optimistic updates for interactions
- Database indexes on key columns
- Efficient query patterns
- Next.js automatic caching

## 🐛 Troubleshooting

### Posts not showing?
- Check user is authenticated
- Verify database migration applied
- Check post status is 'active'

### Likes not working?
- Check RLS policies enabled
- Verify user authentication
- Check browser console for errors

### Helper scores not updating?
- Verify triggers created successfully
- Check comment author is not null
- Run: `SELECT * FROM helper_scores;`

## 🔮 Future Enhancements

- [ ] Report inappropriate content
- [ ] Edit/delete own posts
- [ ] Admin moderation dashboard
- [ ] Optional topic tags
- [ ] Bookmark posts

## 📞 Need Help?

1. Check the [Setup Guide](../../docs/COMMUNITY_SETUP.md)
2. Review the [Visual Guide](../../docs/COMMUNITY_VISUAL_GUIDE.md)
3. Check Supabase logs for errors
4. Review browser console

## ✨ Credits

Implemented with ❤️ for the ADHD community  
Following principles of supportive, pressure-free interaction

---

**Version:** 1.0.0  
**Last Updated:** December 16, 2024  
**Status:** Production Ready
