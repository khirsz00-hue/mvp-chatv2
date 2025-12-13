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
