-- ============================================================
--  Mijn plekken — Supabase schema
--  Plak dit in de SQL Editor van je Supabase-project en run het.
-- ============================================================

-- ── Tabellen ────────────────────────────────────────────────

create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade default auth.uid(),
  name        text not null,
  emoji       text not null default '📍',
  color       text not null default '#0f2b24',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.places (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade default auth.uid(),
  tag_id      uuid references public.tags on delete set null,
  name        text not null,
  note        text,
  address     text,
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);

-- Sneller ophalen van je eigen plekken
create index if not exists places_user_idx on public.places (user_id);
create index if not exists places_tag_idx  on public.places (tag_id);
create index if not exists tags_user_idx   on public.tags   (user_id);

-- ── Row Level Security ──────────────────────────────────────
-- Zonder dit kan iedereen met de publieke sleutel alles lezen.
-- Dit is de enige echte beveiliging van je data. Niet overslaan.

alter table public.places enable row level security;
alter table public.tags   enable row level security;

drop policy if exists "eigen plekken" on public.places;
create policy "eigen plekken" on public.places
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "eigen tags" on public.tags;
create policy "eigen tags" on public.tags
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Nieuwe gebruiker krijgt een set starttags ───────────────
-- Anders staat iemand bij de eerste plek voor een lege dropdown.

create or replace function public.seed_default_tags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tags (user_id, name, emoji, color) values
    (new.id, 'Restaurant',         '🍽️', '#d1495b'),
    (new.id, 'Bar',                '🍸', '#7b4bb7'),
    (new.id, 'Café',               '☕', '#c07d2a'),
    (new.id, 'Hotel',              '🛏️', '#2a6fb0'),
    (new.id, 'Winkel',             '🛍️', '#158a6e'),
    (new.id, 'Bezienswaardigheid', '🏛️', '#3f7d20'),
    (new.id, 'Uitzicht',           '🌇', '#0e7c86'),
    (new.id, 'Park',               '🌳', '#4a7a3a');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_tags();

-- ── Realtime (zodat telefoon en laptop elkaar bijwerken) ────
-- Kan ook via het dashboard: Database > Replication.

alter publication supabase_realtime add table public.places;
alter publication supabase_realtime add table public.tags;
