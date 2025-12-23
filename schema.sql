-- Tabela użytkowników z dostępem
create table if not exists user_access (
  user_id uuid primary key,
  paid boolean default false
);

-- Tabela sesji Six Hats
create table if not exists hats_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text,
  created_at timestamp default now()
);

-- Tabela wiadomości Six Hats
create table if not exists hats_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references hats_sessions(id),
  role text check (role in ('user', 'assistant')),
  hat text,
  content text,
  created_at timestamp default now()
);

-- Tabela tokenów Todoist
create table if not exists user_tokens (
  provider text,
  user_id uuid references auth.users(id),
  access_token text,
  unique (provider, user_id)
);

-- Tabela analityki zadań użytkownika (dla AI learning)
create table if not exists user_task_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,  -- Todoist user ID or session identifier
  task_id text not null,
  task_title text not null,
  task_project text,
  task_labels text[],
  priority integer,
  estimated_duration integer,  -- in minutes
  actual_duration integer,  -- in minutes (from timer)
  due_date date,
  completed_date timestamp,
  created_at timestamp default now(),
  action_type text check (action_type in ('created', 'completed', 'postponed', 'deleted')),
  postponed_from date,  -- original date if postponed
  postponed_to date,  -- new date if postponed
  completion_speed text check (completion_speed in ('early', 'on-time', 'late', null)),
  metadata jsonb  -- additional context
);

-- Indeksy dla wydajności
create index if not exists idx_user_task_analytics_user_id on user_task_analytics(user_id);
create index if not exists idx_user_task_analytics_action_type on user_task_analytics(action_type);
create index if not exists idx_user_task_analytics_created_at on user_task_analytics(created_at desc);

-- Reguły bezpieczeństwa RLS
alter table user_access enable row level security;
alter table hats_sessions enable row level security;
alter table hats_messages enable row level security;
alter table user_tokens enable row level security;

create policy "Użytkownik widzi tylko swoje dane"
  on user_access for select
  using (auth.uid() = user_id);

create policy "Użytkownik może zmienić swój status"
  on user_access for update
  using (auth.uid() = user_id);

create policy "Wiadomości tylko własne"
  on hats_messages for all
  using (auth.uid() = (select user_id from hats_sessions where id = session_id));

-- ========================================
-- COMMUNITY MODULE (ADHD Support Wall)
-- ========================================

-- 🔹 Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
   author_id uuid references auth.users(id) on delete set null,
   is_anonymous boolean default true,
   content text not null,
   tags text[] default '{}',
   like_count integer default 0,
   comment_count integer default 0,
   status text check (status in ('active', 'hidden', 'reported')) default 'active'
  );

-- 🔹 Comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  created_at timestamp with time zone default now(),
  author_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean default true,
  content text not null,
  like_count integer default 0,
  status text check (status in ('active', 'hidden', 'reported')) default 'active'
);

-- 🔹 Likes table
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text check (target_type in ('post', 'comment')) not null,
  target_id uuid not null,
  created_at timestamp with time zone default now(),
  unique (user_id, target_type, target_id)
);

-- 🔹 Helper scores table
create table if not exists helper_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score integer default 0,
  updated_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_posts_status on posts(status);
create index if not exists idx_posts_tags on posts using gin(tags);
create index if not exists idx_comments_post_id on comments(post_id);
create index if not exists idx_comments_created_at on comments(created_at desc);
create index if not exists idx_likes_user_id on likes(user_id);
create index if not exists idx_likes_target on likes(target_type, target_id);
create index if not exists idx_helper_scores_score on helper_scores(score desc);

-- 🔒 RLS Policies
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table helper_scores enable row level security;

-- Posts policies
create policy "Anyone can read active posts"
  on posts for select
  using (auth.uid() is not null and status = 'active');

create policy "Authenticated users can create posts"
  on posts for insert
  with check (auth.uid() is not null and auth.uid() = author_id);

create policy "Users can update own posts"
  on posts for update
  using (auth.uid() = author_id);

-- Comments policies
create policy "Anyone can read active comments"
  on comments for select
  using (auth.uid() is not null and status = 'active');

create policy "Authenticated users can create comments"
  on comments for insert
  with check (auth.uid() is not null and auth.uid() = author_id);

create policy "Users can update own comments"
  on comments for update
  using (auth.uid() = author_id);

-- Likes policies
create policy "Authenticated users can read likes"
  on likes for select
  using (auth.uid() is not null);

create policy "Users can create own likes"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own likes"
  on likes for delete
  using (auth.uid() = user_id);

-- Helper scores policies
create policy "Anyone can read helper scores"
  on helper_scores for select
  using (auth.uid() is not null);

create policy "System can update helper scores"
  on helper_scores for all
  using (true);

-- 🔧 Functions and Triggers

-- Function to update post comment count
create or replace function update_post_comment_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trigger_update_post_comment_count
after insert or delete on comments
for each row execute function update_post_comment_count();

-- Function to update like counts and helper scores
create or replace function update_like_counts_and_scores()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.target_type = 'post' then
      update posts set like_count = like_count + 1 where id = new.target_id;
    elsif new.target_type = 'comment' then
      update comments set like_count = like_count + 1 where id = new.target_id;
      
      -- Increment helper score for comment author
      insert into helper_scores (user_id, score, updated_at)
      select author_id, 1, now()
      from comments
      where id = new.target_id and author_id is not null
      on conflict (user_id)
      do update set score = helper_scores.score + 1, updated_at = now();
    end if;
  elsif tg_op = 'DELETE' then
    if old.target_type = 'post' then
      update posts set like_count = greatest(like_count - 1, 0) where id = old.target_id;
    elsif old.target_type = 'comment' then
      update comments set like_count = greatest(like_count - 1, 0) where id = old.target_id;
      
      -- Decrement helper score for comment author
      update helper_scores
      set score = greatest(score - 1, 0), updated_at = now()
      where user_id = (select author_id from comments where id = old.target_id and author_id is not null);
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trigger_update_like_counts_and_scores
after insert or delete on likes
for each row execute function update_like_counts_and_scores();

-- ========================================
-- SAAS FUNCTIONALITY
-- ========================================

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type text NOT NULL, -- 'messages', 'tasks', 'decisions', 'ai_analyses'
  count integer DEFAULT 1,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_resource ON usage_tracking(user_id, resource_type, period_start);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage"
  ON usage_tracking FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update usage"
  ON usage_tracking FOR UPDATE
  USING (true);

-- Webhook errors logging
CREATE TABLE IF NOT EXISTS webhook_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text,
  error_message text,
  event_data jsonb,
  created_at timestamp DEFAULT now()
);

-- Note: We cannot directly ALTER user_profiles from schema.sql since it's managed by migrations
-- These columns should be added via a new migration file:
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_end_date timestamp;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_start_date timestamp;
