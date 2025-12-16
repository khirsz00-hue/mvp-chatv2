# Community Module Setup Guide

## Prerequisites

Before setting up the Community Module, ensure you have:

1. ✅ Next.js 14+ with App Router
2. ✅ Supabase project configured
3. ✅ Environment variables set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE` (optional, for admin functions)

## Installation Steps

### Step 1: Apply Database Schema

You have two options:

#### Option A: Run the migration file

```bash
# Using Supabase CLI
supabase migration up

# Or directly via SQL
psql $DATABASE_URL < supabase/migrations/20231216_community_module.sql
```

#### Option B: Copy schema to Supabase SQL Editor

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `schema.sql` (community section at the bottom)
4. Execute the SQL

### Step 2: Verify Tables Created

Check that the following tables exist in your Supabase database:

- `posts`
- `comments`
- `likes`
- `helper_scores`

You can verify in Supabase Dashboard > Table Editor.

### Step 3: Verify RLS Policies

Ensure Row Level Security is enabled for all tables:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('posts', 'comments', 'likes', 'helper_scores');
```

All should return `rowsecurity = true`.

### Step 4: Test the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Log in to the application

3. Navigate to the Community section from the sidebar

4. Try creating a post

5. Try commenting on a post

6. Try liking posts and comments

## Troubleshooting

### "Table does not exist" error

**Solution**: Run the database migration again. Ensure your database connection is correct.

### "Permission denied" errors

**Solution**: Check RLS policies are correctly applied. You can temporarily disable RLS for testing:

```sql
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
-- Re-enable after testing
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

### "Not authenticated" errors

**Solution**: Ensure user is logged in. The community requires authentication. Check that Supabase auth cookies are being set correctly.

### Posts not appearing

**Solution**: 
1. Check post status is 'active'
2. Verify RLS policies allow SELECT
3. Check browser console for errors

### Helper scores not updating

**Solution**: 
1. Verify triggers were created successfully
2. Check trigger function exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%like%';
   ```

## Verification Checklist

After setup, verify:

- [ ] Can create posts
- [ ] Can view posts in chronological order
- [ ] Can comment on posts
- [ ] Can like posts
- [ ] Can like comments
- [ ] Helper scores update when comments are liked
- [ ] Comment count updates automatically
- [ ] Like count updates automatically
- [ ] Can unlike posts/comments
- [ ] Anonymous posts display correctly
- [ ] Navigation to community works from sidebar

## Database Indexes

The following indexes are created for performance:

- `idx_posts_created_at` - Fast chronological sorting
- `idx_posts_status` - Filter by status
- `idx_comments_post_id` - Fast comment lookup by post
- `idx_comments_created_at` - Chronological comment sorting
- `idx_likes_user_id` - User's likes lookup
- `idx_likes_target` - Target likes lookup
- `idx_helper_scores_score` - Helper ranking

## Security Notes

⚠️ **Important Security Considerations**:

1. **RLS must be enabled** - Never disable RLS in production
2. **Service role key** - Keep SUPABASE_SERVICE_ROLE secret and server-side only
3. **Content validation** - Server actions validate content length and user auth
4. **Rate limiting** - Consider adding rate limiting to prevent spam (not included in this implementation)

## Performance Optimization

For large-scale deployments:

1. **Pagination**: Add cursor-based pagination for posts (currently loads last 50)
2. **Caching**: Use React Query or SWR for client-side caching
3. **CDN**: Serve static assets via CDN
4. **Database**: Monitor query performance and add indexes as needed

## Next Steps

After successful setup:

1. ✅ Test all functionality
2. ✅ Consider content moderation policies
3. ✅ Plan for admin dashboard (future)
4. ✅ Monitor helper scores and community engagement
5. ✅ Gather user feedback for improvements

## Support

For issues or questions:
- Check the main README.md
- Review COMMUNITY_MODULE.md for architecture details
- Check Supabase logs for database errors
- Review browser console for client-side errors
