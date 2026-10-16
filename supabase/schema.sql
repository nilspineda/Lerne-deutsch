-- ============ Deutsch Karten · esquema ============
-- Ejecutar completo en Supabase → SQL Editor

create table if not exists public.words (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid default auth.uid() references auth.users(id) on delete cascade, -- NULL = catálogo global
  de         text not null,
  article    text check (article in ('der','die','das')),
  es         text not null,
  ipa        text,      -- pronunciación en alfabeto fonético (IPA)
  respell    text,      -- pronunciación "a la española"
  example    text,
  topic      text not null default 'personal',
  level      text not null default 'A1.1',
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner, de)
);

-- Una fila por palabra Y por pista: 'meaning' (leer → significado) y 'pron' (escuchar → recordar)
create table if not exists public.user_cards (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  word_id       uuid not null references public.words(id) on delete cascade,
  track         text not null check (track in ('meaning','pron')),
  due           timestamptz not null default now(),
  interval_days int  not null default 0,
  ease          numeric(4,2) not null default 2.5,
  reps          int  not null default 0,
  lapses        int  not null default 0,
  last_reviewed timestamptz,
  primary key (user_id, word_id, track)
);
create index if not exists user_cards_due_idx on public.user_cards (user_id, track, due);

create table if not exists public.review_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  word_id     uuid not null references public.words(id) on delete cascade,
  track       text not null,
  rating      smallint not null check (rating between 0 and 3),
  reviewed_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.words      enable row level security;
alter table public.user_cards enable row level security;
alter table public.review_log enable row level security;

create policy "words: ver catálogo y propias" on public.words for select using (owner is null or owner = auth.uid());
create policy "words: crear propias"          on public.words for insert with check (owner = auth.uid());
create policy "words: editar propias"         on public.words for update using (owner = auth.uid());
create policy "words: borrar propias"         on public.words for delete using (owner = auth.uid());
create policy "cards: todo lo propio"         on public.user_cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "log: ver propio"               on public.review_log for select using (user_id = auth.uid());
create policy "log: insertar propio"          on public.review_log for insert with check (user_id = auth.uid());

-- ============ Palabras aleatorias del catálogo ============
create or replace function public.add_random_words(p_n int default 5, p_level text default null, p_topic text default null)
returns int language plpgsql security invoker set search_path = public as $$
declare v_count int;
begin
  with pick as (
    select w.id from public.words w
    where w.owner is null
      and (p_level is null or w.level = p_level)
      and (p_topic is null or w.topic = p_topic)
      and not exists (select 1 from public.user_cards c where c.user_id = auth.uid() and c.word_id = w.id)
    order by random() limit p_n
  ), ins as (
    insert into public.user_cards (user_id, word_id, track)
    select auth.uid(), pick.id, t from pick, unnest(array['meaning','pron']) t
    returning 1
  )
  select (count(*) / 2)::int into v_count from ins;
  return v_count;
end $$;
