-- Ejecutar después de supabase/quiz-a1.1.sql.
-- Extiende la lectura de intentos solo al administrador del ranking.

alter table public.quiz_attempts
  add column if not exists display_name text not null default 'Estudiante';

update public.quiz_attempts as attempt
set display_name = coalesce(
  nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
  nullif(btrim(account.raw_user_meta_data ->> 'name'), ''),
  nullif(split_part(account.email, '@', 1), ''),
  'Estudiante'
)
from auth.users as account
where account.id = attempt.user_id
  and attempt.display_name = 'Estudiante';

-- Directorio administrativo: auth.users no se expone directamente por la API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.quiz_user_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  registered_at timestamptz not null default now()
);

alter table public.quiz_user_directory enable row level security;
revoke all on public.quiz_user_directory from anon, authenticated;
grant select on public.quiz_user_directory to authenticated;

drop policy if exists "quiz directory: admin read" on public.quiz_user_directory;
create policy "quiz directory: admin read"
  on public.quiz_user_directory
  for select
  to authenticated
  using (lower((select auth.jwt() ->> 'email')) = 'nilspineda@gmail.com');

create or replace function private.sync_quiz_user_directory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.quiz_user_directory (user_id, display_name, registered_at)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Estudiante'
    ),
    new.created_at
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name;
  return new;
end;
$$;

revoke all on function private.sync_quiz_user_directory() from public, anon, authenticated;
drop trigger if exists on_auth_user_synced_quiz_directory on auth.users;
create trigger on_auth_user_synced_quiz_directory
  after insert or update of raw_user_meta_data, email on auth.users
  for each row execute function private.sync_quiz_user_directory();

insert into public.quiz_user_directory (user_id, display_name, registered_at)
select
  account.id,
  coalesce(
    nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(account.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(account.email, '@', 1), ''),
    'Estudiante'
  ),
  account.created_at
from auth.users as account
on conflict (user_id) do update
  set display_name = excluded.display_name,
      registered_at = excluded.registered_at;

drop policy if exists "quiz attempts: leer ranking admin" on public.quiz_attempts;
create policy "quiz attempts: leer ranking admin"
  on public.quiz_attempts
  for select
  to authenticated
  using (lower((select auth.jwt() ->> 'email')) = 'nilspineda@gmail.com');

create or replace view public.quiz_a11_leaderboard
with (security_invoker = true)
as
  select distinct on (user_id)
    user_id,
    display_name,
    score,
    total_questions,
    percentage,
    finished_at
  from public.quiz_attempts
  where quiz_key = 'final-a1.1'
  order by user_id, percentage desc, finished_at asc;

revoke all on public.quiz_a11_leaderboard from anon;
grant select on public.quiz_a11_leaderboard to authenticated;

create or replace view public.quiz_a11_participant_status
with (security_invoker = true)
as
  select
    directory.user_id,
    directory.display_name,
    directory.registered_at,
    best.score,
    best.total_questions,
    best.percentage,
    best.finished_at
  from public.quiz_user_directory as directory
  left join lateral (
    select attempt.score, attempt.total_questions, attempt.percentage, attempt.finished_at
    from public.quiz_attempts as attempt
    where attempt.user_id = directory.user_id
      and attempt.quiz_key = 'final-a1.1'
    order by attempt.percentage desc, attempt.finished_at asc
    limit 1
  ) as best on true;

revoke all on public.quiz_a11_participant_status from anon;
grant select on public.quiz_a11_participant_status to authenticated;
