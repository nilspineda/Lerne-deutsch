-- ============ Quiz · registro y estadísticas por usuario ============
-- Ejecutar UNA VEZ en Supabase → SQL Editor

create table if not exists public.quiz_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  word_id     uuid not null references public.words(id) on delete cascade,
  quiz_type   text not null default 'artikel',
  correct     boolean not null,
  answered_at timestamptz not null default now()
);
create index if not exists quiz_log_user_idx on public.quiz_log (user_id, quiz_type, answered_at desc);

alter table public.quiz_log enable row level security;
create policy "quiz: todo lo propio" on public.quiz_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
