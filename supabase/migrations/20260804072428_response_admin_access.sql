alter table public.form_maker_projects
add column if not exists response_count bigint not null default 0;

alter table public.form_maker_projects
drop constraint if exists form_maker_response_count_nonnegative;

alter table public.form_maker_projects
add constraint form_maker_response_count_nonnegative check (response_count >= 0);

update public.form_maker_projects as project
set response_count = (
  select count(*)
  from public.form_maker_submissions as submission
  where submission.project_id = project.id
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.update_form_maker_response_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.form_maker_projects
    set response_count = response_count + 1
    where id = new.project_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.form_maker_projects
    set response_count = greatest(response_count - 1, 0)
    where id = old.project_id;
    return old;
  end if;

  if old.project_id is distinct from new.project_id then
    update public.form_maker_projects
    set response_count = greatest(response_count - 1, 0)
    where id = old.project_id;

    update public.form_maker_projects
    set response_count = response_count + 1
    where id = new.project_id;
  end if;

  return new;
end;
$$;

revoke all on function private.update_form_maker_response_count() from public, anon, authenticated;

drop trigger if exists form_maker_submissions_response_count on public.form_maker_submissions;
create trigger form_maker_submissions_response_count
after insert or delete or update of project_id on public.form_maker_submissions
for each row execute function private.update_form_maker_response_count();

create table if not exists public.form_maker_admin_security (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  pin_salt text not null,
  iterations integer not null default 210000,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_maker_admin_pin_hash_format check (pin_hash ~ '^[0-9a-f]{64}$'),
  constraint form_maker_admin_pin_salt_format check (pin_salt ~ '^[0-9a-f]{32}$'),
  constraint form_maker_admin_iterations_range check (iterations between 100000 and 1000000),
  constraint form_maker_admin_failed_attempts_range check (failed_attempts between 0 and 20)
);

create table if not exists public.form_maker_admin_sessions (
  token_hash text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint form_maker_admin_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists form_maker_admin_sessions_owner_expires_idx
on public.form_maker_admin_sessions (owner_id, expires_at desc);

alter table public.form_maker_admin_security enable row level security;
alter table public.form_maker_admin_security force row level security;
alter table public.form_maker_admin_sessions enable row level security;
alter table public.form_maker_admin_sessions force row level security;

revoke all on public.form_maker_admin_security from public, anon, authenticated;
revoke all on public.form_maker_admin_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.form_maker_admin_security to service_role;
grant select, insert, update, delete on public.form_maker_admin_sessions to service_role;

drop policy if exists "form maker owners read submissions" on public.form_maker_submissions;
drop policy if exists "form maker owners update submissions" on public.form_maker_submissions;
drop policy if exists "form maker owners delete submissions" on public.form_maker_submissions;

revoke select, update, delete on public.form_maker_submissions from authenticated;
grant select, update, delete on public.form_maker_submissions to service_role;
