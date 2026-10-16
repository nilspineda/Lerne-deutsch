-- ============ Palabras guardadas (favoritos personales) ============
-- Guarda palabras para repasarlas después, solo tuyas. Ejecutar en Supabase SQL Editor.
create table if not exists public.saved_words (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, word_id)
);
create index if not exists saved_words_user_idx on public.saved_words (user_id, saved_at desc);

alter table public.saved_words enable row level security;
create policy "guardadas: todo lo propio" on public.saved_words
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
