# Todoist Mobile OAuth Fix Documentation

## Problem Summary
Mobile devices (iOS Safari, Android Chrome, webviews) were experiencing OAuth connection failures with Todoist, resulting in:
- 404 errors from Todoist API when fetching user info
- "Nie udało się połączyć z Todoist" error messages
- Failed authentication in logs: `[Todoist Callback] Error: Failed to fetch Todoist user info: 404`

## Root Causes

### 1. API Endpoint Issues
The Todoist REST API v2 endpoint `https://api.todoist.com/rest/v2/users/me` was returning 404 errors inconsistently, particularly on mobile devices.

### 2. Network Reliability
Mobile networks are less reliable than desktop connections, causing transient failures in API calls without retry logic.

### 3. Missing Fallbacks
When user info couldn't be fetched, the entire OAuth flow failed instead of gracefully degrading.

### 4. Poor Error Messages
Generic error messages didn't help users understand what went wrong or how to fix it.

## Solutions Implemented

### 1. API Endpoint Fix (`app/api/todoist/callback/route.ts`)

#### Change: Use Sync API v9 as Primary
```typescript
// Primary: Sync API v9 (more reliable)
const syncRes = await fetchWithRetry('https://api.todoist.com/sync/v9/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sync_token: '*',
    resource_types: ['user']
  })
})

// Fallback: REST API v2
if (!syncRes.ok) {
  const restRes = await fetchWithRetry('https://api.todoist.com/rest/v2/users/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
}
```

**Why**: Sync API v9 is more reliable than REST API v2, especially on mobile devices.

#### Change: Graceful Degradation
```typescript
// Save token even if user_id fetch fails
const updateData: { todoist_token: string; todoist_user_id?: string } = {
  todoist_token: data.access_token
}

if (todoistUserId) {
  updateData.todoist_user_id = todoistUserId
}
```

**Why**: The access token is valuable even without the user_id. Most operations work with just the token.

### 2. Retry Logic (`lib/utils/networkUtils.ts`)

```typescript
export async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) return response
      
      // Retry on 404 or 5xx with exponential backoff
      if (attempt < retries - 1 && (response.status === 404 || response.status >= 500)) {
        const delay = 1000 * (attempt + 1) // 1s, 2s, 3s
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      return response
    } catch (err) {
      if (attempt === retries - 1) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}
```

**Applied to**:
- OAuth token exchange
- User info fetching (both Sync and REST APIs)
- Todoist projects API
- All external API calls

### 3. Mobile Detection (`lib/utils/networkUtils.ts`)

```typescript
export function parseUserAgent(userAgent: string): {
  isMobile: boolean
  isWebview: boolean
  platform: string
  details: string
} {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)
  const isWebview = /WebView|wv|FB_IAB|FBAN|FBAV/i.test(userAgent)
  
  let platform = 'desktop'
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    platform = 'iOS'
  } else if (/Android/i.test(userAgent)) {
    platform = 'Android'
  }
  
  return { isMobile, isWebview, platform, details: userAgent.substring(0, 100) }
}
```

**Used in**:
- OAuth auth endpoint (logs device type)
- OAuth callback endpoint (logs device type and detects webview issues)

### 4. Improved Error Messages

#### Backend (`app/api/todoist/projects/route.ts`)
```typescript
if (response.status === 401) {
  return NextResponse.json({ 
    error: 'Token expired',
    message: 'Twój token Todoist wygasł. Połącz się ponownie.',
    projects: [] 
  }, { status: 401 })
}

if (response.status === 429) {
  return NextResponse.json({ 
    error: 'Rate limit',
    message: 'Zbyt wiele zapytań do Todoist. Spróbuj za chwilę.',
    projects: [] 
  }, { status: 429 })
}
```

#### Frontend (`app/page.tsx`)
```typescript
if (errorDetails) {
  if (errorDetails.includes('401') || errorDetails.includes('Token')) {
    message = 'Nie udało się połączyć z Todoist. Spróbuj ponownie.'
  } else if (errorDetails.includes('404')) {
    message = 'Nie udało się pobrać danych z Todoist. Spróbuj ponownie.'
  } else if (errorDetails.includes('Network') || errorDetails.includes('fetch')) {
    message = 'Problem z połączeniem. Sprawdź internet i spróbuj ponownie.'
  }
}
```

### 5. Debug Mode

Added `?debug=1` parameter support for detailed logging:

```typescript
const debug = searchParams.get('debug') === '1'

if (debug) {
  console.log('🐛 [Todoist Callback] Debug mode - User agent:', deviceInfo.details)
}
```

**Usage**: Add `?debug=1` to OAuth URLs for verbose logging in production.

### 6. Database Token Management

#### Recap Endpoints
All recap endpoints now:
1. Accept optional `token` parameter for backward compatibility
2. Fetch token from database if not provided
3. Handle token expiry with clear error messages

```typescript
// Get token from database if not provided
let todoistToken = fallbackToken
if (!todoistToken) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('todoist_token')
    .eq('id', user.id)
    .single()
  
  todoistToken = profile?.todoist_token
}
```

## Testing Checklist

### Local Testing
- [x] Linter passes
- [x] Build succeeds
- [x] TypeScript compilation clean

### Production Testing (Required)
- [ ] OAuth flow works on iOS Safari
- [ ] OAuth flow works on Android Chrome
- [ ] OAuth flow works in Facebook in-app browser
- [ ] OAuth flow works in Instagram in-app browser
- [ ] Error messages display correctly
- [ ] Retry logic activates on network failures
- [ ] Debug mode logs appear in Vercel logs
- [ ] Token saves to database successfully
- [ ] Recap endpoints work with database token

### Manual Test Procedure

1. **Clear existing tokens**:
   ```javascript
   // In browser console
   localStorage.removeItem('todoist_token')
   ```

2. **Test OAuth on mobile device**:
   - Navigate to app on mobile device
   - Click "Połącz z Todoist"
   - Complete Todoist authorization
   - Verify success message appears
   - Check Vercel logs for mobile detection

3. **Test error handling**:
   - Disconnect network mid-OAuth
   - Verify retry attempts in logs
   - Verify user-friendly error message

4. **Test debug mode**:
   - Access `/api/todoist/auth?debug=1`
   - Complete OAuth flow
   - Verify detailed logs in Vercel

## Monitoring

### Key Logs to Watch

```
✅ [Todoist Callback] OAuth initiation: { isMobile: true, platform: 'iOS' }
✅ [Todoist Callback] Authenticated user: <user_id>
🔄 [Fetch Retry] Attempt 1/3 for https://api.todoist.com/sync/v9/sync
✅ [Fetch Retry] Success on attempt 1
✅ [Todoist Callback] Got user ID from Sync API: <todoist_user_id>
✅ [Todoist Callback] Successfully saved to database
```

### Error Patterns to Monitor

```
❌ [Todoist Callback] No authorization code provided
❌ [Todoist Callback] No authenticated user
❌ [Fetch Retry] All 3 attempts failed
⚠️ [Todoist Callback] Sync API response missing user.id
```

## Troubleshooting

### Issue: Still getting 404 errors

**Check**:
1. Verify Sync API is being called (check logs)
2. Verify retry logic is executing (should see 3 attempts)
3. Check if user-agent detection is working (logs should show device type)
4. Enable debug mode: `/api/todoist/auth?debug=1`

### Issue: Token not saving to database

**Check**:
1. Verify `user_profiles.todoist_token` column exists
2. Check RLS policies allow updates for authenticated users
3. Verify user is authenticated (logs should show user ID)
4. Check database error logs

### Issue: Webview not working

**Check**:
1. Verify webview is detected in logs (`isWebview: true`)
2. Check if cookies are being set properly
3. Consider alternative OAuth flow for problematic webviews
4. Test with different webview (e.g., Safari View Controller on iOS)

## Future Improvements

### Potential Enhancements
1. **Token refresh**: Implement automatic token refresh before expiry
2. **Alternative OAuth**: Add option to copy token manually for problematic webviews
3. **Cache**: Cache project lists to reduce API calls
4. **Webhooks**: Use Todoist webhooks instead of polling for updates
5. **Batch operations**: Reduce number of API calls by batching requests

### Known Limitations
1. Some webviews may still have cookie issues
2. Retry logic adds latency (up to 6 seconds in worst case)
3. No automatic token refresh - users must reconnect when token expires

## Related Files

- `app/api/todoist/callback/route.ts` - OAuth callback handler
- `app/api/todoist/auth/route.ts` - OAuth initiation
- `app/api/todoist/projects/route.ts` - Projects API with retry
- `app/api/recap/today/route.ts` - Today's recap with DB token
- `app/api/recap/yesterday/route.ts` - Yesterday's recap with DB token
- `app/api/recap/summary/route.ts` - Daily summary with DB token
- `app/page.tsx` - Error message display
- `lib/utils/networkUtils.ts` - Retry and mobile detection utilities
- `supabase/migrations/20251228_add_todoist_user_id.sql` - Database schema

## References

- [Todoist Sync API Documentation](https://developer.todoist.com/sync/v9/)
- [Todoist REST API Documentation](https://developer.todoist.com/rest/v2/)
- [OAuth 2.0 Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
