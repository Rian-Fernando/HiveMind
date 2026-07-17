-- ═══════════════════════════════════════════════════════════════════
-- HiveMind — Supabase schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run
-- (If you ran an older version of this file, easiest reset:
--    drop table if exists public.ideas; drop table if exists public.rooms;
--  then run this file again.)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  event_name  text not null,
  max_participants int not null check (max_participants between 2 and 50),
  -- SHA-256 hash of the host's secret key. The raw key is only ever held
  -- by the host's browser, so anon reads of this row can't impersonate them.
  host_key_hash text not null,
  status      text not null default 'open' check (status in ('open', 'generating', 'done')),
  results     jsonb,
  -- optional pitch deadline: generation auto-fires when it passes (with 2+ ideas)
  deadline_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  author_name text not null,          -- "Anonymous" when hide_name is true
  idea_text   text not null,
  hide_name   boolean not null default false,
  hide_idea   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- One idea per (visible) person per room. Anonymous rows are exempt.
create unique index if not exists ideas_room_author_unique
  on public.ideas (room_id, lower(author_name))
  where not hide_name;

create index if not exists ideas_room_idx on public.ideas (room_id);

-- One vote per person per room, changeable (upsert)
create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  idea_index  int not null check (idea_index between 0 and 7),
  voter_key   text not null,
  created_at  timestamptz not null default now(),
  unique (room_id, voter_key)
);
create index if not exists votes_room_idx on public.votes (room_id);

-- Emoji reactions on visible pitches during the submission phase
create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  idea_id     uuid not null references public.ideas(id) on delete cascade,
  emoji       text not null check (emoji in ('🔥','💡','😂')),
  reactor_key text not null,
  created_at  timestamptz not null default now(),
  unique (idea_id, reactor_key, emoji)
);
create index if not exists reactions_room_idx on public.reactions (room_id);

-- ── Row Level Security ────────────────────────────────────────────
-- All writes go through the Next.js API routes using the service-role
-- key (which bypasses RLS).
--
-- rooms:  readable by the browser (anon) — contains nothing sensitive;
--         host key is hashed and results are privacy-masked before insert.
-- ideas:  NOT readable by the browser at all. Because participants can
--         mark their name and/or idea text as private, every read goes
--         through /api/progress, which masks per-row privacy flags.
alter table public.rooms enable row level security;
alter table public.ideas enable row level security;
alter table public.votes enable row level security;
alter table public.reactions enable row level security;

drop policy if exists "anon can read rooms" on public.rooms;
create policy "anon can read rooms"
  on public.rooms for select
  to anon
  using (true);

-- deliberately NO select policy on public.ideas

-- ── Realtime ──────────────────────────────────────────────────────
-- Clients subscribe to room updates only (idea rows must stay private).
-- The /api/ideas route bumps rooms.updated_at on every submission, so
-- subscribers still get an instant "something changed" signal.
alter publication supabase_realtime add table public.rooms;
