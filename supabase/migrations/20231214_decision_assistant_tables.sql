-- Decision Assistant Tables
-- Stores decisions, options, and analysis events for the AI decision assistant

-- Users table extension (if not exists via auth.users)
-- This table stores additional user metadata for the decision assistant
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Decisions table
-- Stores user decisions with status tracking
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  context text,
  status text check (status in ('pending', 'analyzing', 'analyzed', 'decided', 'archived')) default 'pending',
  decision_made text,
  confidence_score integer check (confidence_score >= 0 and confidence_score <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Decision Options table
-- Stores possible options/choices for each decision
create table if not exists decision_options (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references decisions(id) on delete cascade not null,
  label text not null,
  description text,
  pros text[],
  cons text[],
  score integer check (score >= 0 and score <= 100),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Decision Events table
-- Stores events and AI analysis history for decisions
create table if not exists decision_events (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references decisions(id) on delete cascade not null,
  event_type text check (event_type in ('created', 'option_added', 'ai_analysis', 'status_changed', 'decision_made', 'note_added')) not null,
  payload jsonb default '{}'::jsonb,
  ai_response text,
  created_at timestamptz default now()
);

-- Indexes for better query performance
create index if not exists idx_decisions_user_id on decisions(user_id);
create index if not exists idx_decisions_status on decisions(status);
create index if not exists idx_decisions_created_at on decisions(created_at desc);
create index if not exists idx_decisions_updated_at on decisions(updated_at desc);

create index if not exists idx_decision_options_decision_id on decision_options(decision_id);
create index if not exists idx_decision_options_created_at on decision_options(created_at desc);

create index if not exists idx_decision_events_decision_id on decision_events(decision_id);
create index if not exists idx_decision_events_event_type on decision_events(event_type);
create index if not exists idx_decision_events_created_at on decision_events(created_at desc);

-- Enable Row Level Security (RLS)
alter table users enable row level security;
alter table decisions enable row level security;
alter table decision_options enable row level security;
alter table decision_events enable row level security;

-- RLS Policies for users
create policy "Users can view their own profile"
  on users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on users for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on users for insert
  with check (auth.uid() = id);

-- RLS Policies for decisions
create policy "Users can view their own decisions"
  on decisions for select
  using (auth.uid() = user_id);

create policy "Users can create their own decisions"
  on decisions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own decisions"
  on decisions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own decisions"
  on decisions for delete
  using (auth.uid() = user_id);

-- RLS Policies for decision_options
create policy "Users can view options for their decisions"
  on decision_options for select
  using (auth.uid() = (select user_id from decisions where id = decision_id));

create policy "Users can create options for their decisions"
  on decision_options for insert
  with check (auth.uid() = (select user_id from decisions where id = decision_id));

create policy "Users can update options for their decisions"
  on decision_options for update
  using (auth.uid() = (select user_id from decisions where id = decision_id));

create policy "Users can delete options for their decisions"
  on decision_options for delete
  using (auth.uid() = (select user_id from decisions where id = decision_id));

-- RLS Policies for decision_events
create policy "Users can view events for their decisions"
  on decision_events for select
  using (auth.uid() = (select user_id from decisions where id = decision_id));

create policy "Users can create events for their decisions"
  on decision_events for insert
  with check (auth.uid() = (select user_id from decisions where id = decision_id));

-- Function to update updated_at timestamp automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on decisions
create trigger update_decisions_updated_at
  before update on decisions
  for each row
  execute function update_updated_at_column();
