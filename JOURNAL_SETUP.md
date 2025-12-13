# Journal Assistant - Setup Guide

## Overview
This guide provides step-by-step instructions for setting up the Journal Assistant feature in the MVP Chat v2 application.

## Prerequisites
- Supabase project configured
- Environment variables set on Vercel (or locally)
- User authentication enabled in Supabase

## Environment Variables
The following environment variables must be set (already configured on Vercel):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note:** Do NOT commit the service role key. The application uses the public anon key with RLS policies for security.

## Database Setup

### Step 1: Run the Migration
Execute the SQL migration file to create the required tables and set up Row Level Security (RLS).

1. Navigate to your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the migration file: `supabase/migrations/20231213_journal_tables.sql`
4. Copy the entire content
5. Paste into the SQL Editor
6. Click **Run**

### Step 2: Verify Tables Created
Check that the following tables were created:
- `journal_entries` - Stores journal entries
- `journal_archives` - Stores archived entries

### Step 3: Verify RLS Policies
Ensure Row Level Security is enabled for both tables:
1. Go to **Authentication** > **Policies**
2. Verify that policies exist for:
   - `journal_entries`:
     - Users can view their own journal entries
     - Users can create their own journal entries
     - Users can update their own journal entries
     - Users can delete their own journal entries
   - `journal_archives`:
     - Users can view their own archived entries
     - Users can create their own archive records
     - Users can delete their own archive records

## Database Schema

### journal_entries
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- content: text
- archived: boolean (default false)
- created_at: timestamptz (default now())
```

### journal_archives
```sql
- id: uuid (primary key)
- entry_id: uuid (references journal_entries)
- user_id: uuid
- content: text
- archived_at: timestamptz (default now())
```

## Testing the Feature

### Manual Test Steps

1. **Create a new entry:**
   - Navigate to the Journal section in the sidebar
   - Type content in the "Nowy wpis" (New Entry) textarea
   - Click "Dodaj wpis" (Add Entry)
   - Verify the entry appears in the list below

2. **Edit an entry:**
   - Click "Edytuj" (Edit) on an existing entry
   - Modify the content
   - Click "Zapisz" (Save)
   - Verify the changes are saved

3. **Archive an entry:**
   - Click "Archiwizuj" (Archive) on an entry
   - Verify the entry is removed from the main list
   - Click "Archiwum" (Archive) button in the header
   - Verify the entry appears in the archive list

4. **Delete an entry:**
   - Click "Usuń" (Delete) on an entry
   - Confirm the deletion
   - Verify the entry is removed

5. **View archive:**
   - Click "Archiwum" (Archive) in the header
   - View archived entries
   - Click "Wróć" (Back) to return to the main journal

6. **Delete from archive:**
   - In the archive view, click "Usuń" (Delete)
   - Confirm the permanent deletion
   - Verify the entry is removed from the archive

## User Authentication

The Journal Assistant requires a logged-in user. The component checks for:
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

If no user is authenticated, a message is displayed prompting the user to log in.

## Features

### Main Journal View
- Create new journal entries
- Edit existing entries
- Archive entries for later reference
- Delete entries permanently
- View entries sorted by creation date (newest first)
- Date formatting in Polish locale

### Archive View
- View all archived entries
- Delete archived entries permanently
- Back navigation to main journal

## Security

### Row Level Security (RLS)
All database operations are secured with RLS policies that ensure:
- Users can only access their own data
- All operations (SELECT, INSERT, UPDATE, DELETE) are restricted to the authenticated user
- Data isolation between users

### Client-Side Security
- Uses Supabase public anon key (safe for client-side use)
- All database queries automatically enforce RLS policies
- No sensitive keys exposed in the client code

## Troubleshooting

### "Nie udało się pobrać wpisów" (Failed to fetch entries)
- Check that the migration has been run
- Verify RLS policies are enabled
- Check browser console for specific errors
- Ensure user is authenticated

### "Zaloguj się" (Log in) message appears
- User authentication is not active
- Check Supabase auth configuration
- Verify the auth session is valid

### Entries not appearing
- Check that RLS policies match the user_id correctly
- Verify the user is authenticated
- Check network tab for API errors

## Next Steps

After deployment:
1. Monitor error logs for any issues
2. Collect user feedback
3. Consider adding features like:
   - Search functionality
   - Tags/categories
   - Export to PDF/Markdown
   - Mood tracking
   - Reminders for regular journaling

## Support

For issues or questions:
- Check the Supabase logs
- Review browser console errors
- Verify environment variables are set correctly
