-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  schema_text text not null,
  db_url text,
  has_db boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references connections(id) on delete cascade,
  question text not null,
  sql text,
  created_at timestamptz not null default now()
);

alter table connections enable row level security;
alter table queries enable row level security;

-- Users can only see and modify their own rows.
create policy "Users manage their own connections"
  on connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own queries"
  on queries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
