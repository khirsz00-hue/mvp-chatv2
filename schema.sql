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
