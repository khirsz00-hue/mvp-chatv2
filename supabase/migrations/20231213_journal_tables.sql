-- Journal Entries Table
-- Stores all journal entries with user association
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Journal Archives Table
-- Stores archived journal entries separately for history
create table if not exists journal_archives (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references journal_entries(id) on delete cascade,
  user_id uuid not null,
  content text not null,
  archived_at timestamptz default now()
);

-- Indexes for better query performance
create index if not exists idx_journal_entries_user_id on journal_entries(user_id);
create index if not exists idx_journal_entries_archived on journal_entries(archived);
create index if not exists idx_journal_entries_created_at on journal_entries(created_at desc);
create index if not exists idx_journal_archives_user_id on journal_archives(user_id);
create index if not exists idx_journal_archives_archived_at on journal_archives(archived_at desc);

-- Enable Row Level Security (RLS)
alter table journal_entries enable row level security;
alter table journal_archives enable row level security;

-- RLS Policies for journal_entries
-- Users can only see their own entries
create policy "Users can view their own journal entries"
  on journal_entries for select
  using (auth.uid() = user_id);

-- Users can insert their own entries
create policy "Users can create their own journal entries"
  on journal_entries for insert
  with check (auth.uid() = user_id);

-- Users can update their own entries
create policy "Users can update their own journal entries"
  on journal_entries for update
  using (auth.uid() = user_id);

-- Users can delete their own entries
create policy "Users can delete their own journal entries"
  on journal_entries for delete
  using (auth.uid() = user_id);

-- RLS Policies for journal_archives
-- Users can only see their own archived entries
create policy "Users can view their own archived entries"
  on journal_archives for select
  using (auth.uid() = user_id);

-- Users can insert their own archive records
create policy "Users can create their own archive records"
  on journal_archives for insert
  with check (auth.uid() = user_id);

-- Users can delete their own archive records
create policy "Users can delete their own archive records"
  on journal_archives for delete
  using (auth.uid() = user_id);
