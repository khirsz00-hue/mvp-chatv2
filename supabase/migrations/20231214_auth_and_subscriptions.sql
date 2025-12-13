-- Enhanced User Profiles with Subscription Management
-- Extends the basic user_access table with full profile and subscription data

-- Drop existing user_access table and recreate with more fields
drop table if exists user_access cascade;

-- User profiles table with subscription info
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Subscription fields
  subscription_status text check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'inactive')) default 'inactive',
  subscription_tier text check (subscription_tier in ('free', 'pro', 'enterprise')) default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  trial_end_date timestamptz,
  -- Admin flag
  is_admin boolean default false
);

-- AI Insights table - stores AI-generated conclusions and insights for users
create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  insight_type text check (insight_type in ('task_pattern', 'productivity', 'journal_summary', 'recommendation', 'other')) not null,
  title text not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Magic link tokens table (for custom magic link implementation if needed)
create table if not exists magic_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text unique not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- Subscription history table
create table if not exists subscription_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null, -- 'created', 'updated', 'canceled', 'renewed'
  subscription_status text,
  subscription_tier text,
  stripe_event_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_user_profiles_stripe_customer on user_profiles(stripe_customer_id);
create index if not exists idx_user_profiles_subscription_status on user_profiles(subscription_status);
create index if not exists idx_user_profiles_is_admin on user_profiles(is_admin);
create index if not exists idx_ai_insights_user_id on ai_insights(user_id);
create index if not exists idx_ai_insights_created_at on ai_insights(created_at desc);
create index if not exists idx_ai_insights_type on ai_insights(insight_type);
create index if not exists idx_magic_links_token on magic_links(token);
create index if not exists idx_magic_links_email on magic_links(email);
create index if not exists idx_subscription_history_user_id on subscription_history(user_id);

-- Enable Row Level Security
alter table user_profiles enable row level security;
alter table ai_insights enable row level security;
alter table magic_links enable row level security;
alter table subscription_history enable row level security;

-- RLS Policies for user_profiles
create policy "Users can view their own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on user_profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on user_profiles for select
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update all profiles"
  on user_profiles for update
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- RLS Policies for ai_insights
create policy "Users can view their own insights"
  on ai_insights for select
  using (auth.uid() = user_id);

create policy "Users can create their own insights"
  on ai_insights for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own insights"
  on ai_insights for delete
  using (auth.uid() = user_id);

create policy "Admins can view all insights"
  on ai_insights for select
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- RLS Policies for subscription_history
create policy "Users can view their own subscription history"
  on subscription_history for select
  using (auth.uid() = user_id);

create policy "Admins can view all subscription history"
  on subscription_history for select
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Magic links are managed server-side only, no user policies needed

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_updated_at_column();

-- Function to create user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
