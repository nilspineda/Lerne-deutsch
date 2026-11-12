-- ============ 2026-001 · Contenido: audio + números + unidades ============
-- Ejecutar en Supabase → SQL Editor (es idempotente)
-- Añade:
--   1) columnas de contenido a `words` (audio_url, category, unit, price_eur)
--   2) tabla `numbers` (números cardinales/ordinales/decimales con valor numérico)
--   3) tabla `units` (medidas: kilo, gramo, litro, metro…)
--   4) bucket de Storage `audio` (público, solo lectura desde el cliente)

-- ---------- 1) words: columnas nuevas ----------
alter table public.words add column if not exists audio_url  text;      -- URL pública en /storage/v1/object/public/audio/...
alter table public.words add column if not exists category   text;      -- subcategoría: fruta, verdura, carne, lacteo, panaderia, bebida, limpieza…
alter table public.words add column if not exists unit       text;      -- unidad de compra por defecto: kg, g, l, Stück…
alter table public.words add column if not exists price_eur  numeric(8,2); -- precio orientativo en euros

comment on column public.words.audio_url is 'Audio propio (bucket audio). Si es null se usa el TTS de /api/tts';
comment on column public.words.category  is 'Subcategoría dentro del topic (fruta, verdura, carne, …)';
comment on column public.words.unit      is 'Unidad de medida/venta por defecto (kg, g, l, Stück, Packung)';
comment on column public.words.price_eur is 'Precio orientativo en euros para vocabulario de supermercado';

-- ---------- 2) numbers ----------
create table if not exists public.numbers (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid default auth.uid() references auth.users(id) on delete cascade, -- NULL = catálogo global
  value      numeric(20,6) not null,   -- 21, 21.5, 3.14
  de         text not null,            -- einundzwanzig (escrito, sin dígitos)
  es         text not null,            -- veintiuno
  category   text not null default 'cardinal'
             check (category in ('cardinal','ordinal','decimal','fraction','percentage','money','time')),
  ipa        text,
  respell    text,
  example    text,
  audio_url  text,
  level      text not null default 'A1.2',
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner, de)
);

comment on table public.numbers is 'Números en alemán con su valor numérico, para escuchar y responder con cifras';

-- ---------- 3) units (medidas) ----------
create table if not exists public.units (
  id         uuid primary key default gen_random_uuid(),
  de         text not null unique,     -- das Kilogramm (sin artículo)
  es         text not null,            -- kilogramo
  symbol     text,                    -- kg, g, l, ml, m, cm
  dimension  text not null default 'peso'
             check (dimension in ('peso','volumen','longitud','tiempo','cantidad','moneda')),
  plural_de  text,                    -- die Kilogramme
  ipa        text,
  respell    text,
  example    text,
  audio_url  text,
  level      text not null default 'A1.1',
  created_at timestamptz not null default now()
);

comment on table public.units is 'Unidades de medida y venta: kilo, gramo, litro, metro, pieza, paquete…';

-- ---------- 4) índices ----------
create index if not exists numbers_level_category_idx on public.numbers (level, category) where owner is null;
create index if not exists numbers_value_idx        on public.numbers (value);
create index if not exists units_dimension_idx      on public.units (dimension);
create index if not exists words_category_idx       on public.words (category) where owner is null;

-- ---------- 5) RLS ----------
alter table public.numbers enable row level security;
alter table public.units   enable row level security;

create policy "numbers: ver catálogo y propios" on public.numbers for select using (owner is null or owner = auth.uid());
create policy "numbers: crear propias"          on public.numbers for insert with check (owner = auth.uid());
create policy "numbers: editar propias"         on public.numbers for update using (owner = auth.uid());
create policy "numbers: borrar propias"         on public.numbers for delete using (owner = auth.uid());

create policy "units: ver catálogo"     on public.units for select using (true);
create policy "units: crear propios"   on public.units for insert with check (false);
create policy "units: editar propios"  on public.units for update using (false);
create policy "units: borrar propios"  on public.units for delete using (false);

-- ---------- 5b) SRS de números (una fila por número y por pista) ----------
-- pista 'listen'  : oyes el número → escribes la cifra
-- pista 'reverse' : ves la cifra  → eliges la palabra
create table if not exists public.number_cards (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number_id     uuid not null references public.numbers(id) on delete cascade,
  track         text not null check (track in ('listen','reverse')),
  due           timestamptz not null default now(),
  interval_days int  not null default 0,
  ease          numeric(4,2) not null default 2.5,
  reps          int  not null default 0,
  lapses        int  not null default 0,
  last_reviewed timestamptz,
  primary key (user_id, number_id, track)
);
create index if not exists number_cards_due_idx on public.number_cards (user_id, track, due);

create table if not exists public.number_review_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number_id   uuid not null references public.numbers(id) on delete cascade,
  track       text not null,
  rating      smallint not null check (rating between 0 and 3),
  reviewed_at timestamptz not null default now()
);
create index if not exists number_review_log_user_idx on public.number_review_log (user_id, reviewed_at);

alter table public.number_cards enable row level security;
alter table public.number_review_log enable row level security;

create policy "number_cards: todo lo propio" on public.number_cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "number_log: ver propio"      on public.number_review_log for select using (user_id = auth.uid());
create policy "number_log: insertar propio" on public.number_review_log for insert with check (user_id = auth.uid());

-- agrega N números aleatorios del catálogo a la cola del usuario (ambas pistas)
create or replace function public.add_random_numbers(p_n int default 10, p_category text default null, p_track text default 'listen')
returns int language plpgsql security invoker set search_path = public as $$
declare v_count int;
begin
  with pick as (
    select n.id from public.numbers n
    where n.owner is null
      and (p_category is null or n.category = p_category)
      and not exists (select 1 from public.number_cards c where c.user_id = auth.uid() and c.number_id = n.id and c.track = p_track)
    order by random() limit p_n
  ), ins as (
    insert into public.number_cards (user_id, number_id, track)
    select auth.uid(), pick.id, p_track from pick
    returning 1
  )
  select count(*)::int into v_count from ins;
  return v_count;
end $$;

-- ---------- 6) Storage: bucket público de audio ----------insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update set public = excluded.public;

create policy "audio: leer" on storage.objects for select using (bucket_id = 'audio');
create policy "audio: escribir" on storage.objects for insert with check (bucket_id = 'audio');
create policy "audio: actualizar" on storage.objects for update using (bucket_id = 'audio');
create policy "audio: borrar" on storage.objects for delete using (bucket_id = 'audio');

-- La URL pública del audio se arma en el cliente/script:
--   {SUPABASE_URL}/storage/v1/object/public/audio/{ruta}
