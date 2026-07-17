-- ═══════════════════════════════════════════════════════════════════
-- HiveMind — Migration 002: countdown, voting, reactions
-- Run in Supabase SQL Editor if your project already has the original
-- schema. (Fresh installs: just run schema.sql, which includes all this.)
-- ═══════════════════════════════════════════════════════════════════

-- Optional pitch deadline (host sets it at room creation)
alter table public.rooms add column if not exists deadline_at timestamptz;

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

-- Same posture as ideas: no browser access, all reads/writes via API routes
alter table public.votes enable row level security;
alter table public.reactions enable row level security;
