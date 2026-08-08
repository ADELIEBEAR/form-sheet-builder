create table public.form_maker_project_meta (
  project_id uuid primary key references public.form_maker_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder text not null default '',
  memo text not null default '',
  response_lock_enabled boolean not null default false,
  response_pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_maker_folder_size check (char_length(folder) <= 80),
  constraint form_maker_memo_size check (char_length(memo) <= 2000),
  constraint form_maker_response_lock_has_pin check (not response_lock_enabled or response_pin_hash is not null)
);

create index form_maker_project_meta_owner_folder_idx
on public.form_maker_project_meta (owner_id, folder);

alter table public.form_maker_project_meta enable row level security;

grant select on public.form_maker_project_meta to authenticated;

create policy "form maker owners read project meta"
on public.form_maker_project_meta for select to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.set_form_maker_project_meta(
  target_project_id uuid,
  new_folder text default '',
  new_memo text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
begin
  select project.owner_id
  into current_owner
  from public.form_maker_projects as project
  where project.id = target_project_id;

  if current_owner is null or current_owner is distinct from auth.uid() then
    raise exception 'project_not_found_or_forbidden';
  end if;

  insert into public.form_maker_project_meta (project_id, owner_id, folder, memo)
  values (
    target_project_id,
    current_owner,
    left(trim(coalesce(new_folder, '')), 80),
    left(coalesce(new_memo, ''), 2000)
  )
  on conflict (project_id) do update set
    folder = excluded.folder,
    memo = excluded.memo,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.set_form_maker_response_lock(
  target_project_id uuid,
  new_enabled boolean,
  new_pin text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
  current_hash text;
begin
  select project.owner_id
  into current_owner
  from public.form_maker_projects as project
  where project.id = target_project_id;

  if current_owner is null or current_owner is distinct from auth.uid() then
    raise exception 'project_not_found_or_forbidden';
  end if;

  select meta.response_pin_hash
  into current_hash
  from public.form_maker_project_meta as meta
  where meta.project_id = target_project_id;

  if new_enabled and new_pin is not null and new_pin !~ '^[0-9]{4,8}$' then
    raise exception 'pin_must_be_4_to_8_digits';
  end if;

  if new_enabled and new_pin is null and current_hash is null then
    raise exception 'pin_required';
  end if;

  insert into public.form_maker_project_meta (
    project_id,
    owner_id,
    response_lock_enabled,
    response_pin_hash
  )
  values (
    target_project_id,
    current_owner,
    new_enabled,
    case
      when new_pin is not null then extensions.crypt(new_pin, extensions.gen_salt('bf', 10))
      else current_hash
    end
  )
  on conflict (project_id) do update set
    response_lock_enabled = excluded.response_lock_enabled,
    response_pin_hash = case
      when new_pin is not null then excluded.response_pin_hash
      else public.form_maker_project_meta.response_pin_hash
    end,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.verify_form_maker_response_lock(
  target_project_id uuid,
  candidate_pin text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
  lock_enabled boolean;
  stored_hash text;
begin
  select project.owner_id
  into current_owner
  from public.form_maker_projects as project
  where project.id = target_project_id;

  if current_owner is null or current_owner is distinct from auth.uid() then
    return false;
  end if;

  select meta.response_lock_enabled, meta.response_pin_hash
  into lock_enabled, stored_hash
  from public.form_maker_project_meta as meta
  where meta.project_id = target_project_id;

  if not coalesce(lock_enabled, false) then
    return true;
  end if;

  return stored_hash is not null
    and extensions.crypt(coalesce(candidate_pin, ''), stored_hash) = stored_hash;
end;
$$;

revoke all on public.form_maker_project_meta from anon;
revoke all on function public.set_form_maker_project_meta(uuid, text, text) from public, anon;
revoke all on function public.set_form_maker_response_lock(uuid, boolean, text) from public, anon;
revoke all on function public.verify_form_maker_response_lock(uuid, text) from public, anon;

grant execute on function public.set_form_maker_project_meta(uuid, text, text) to authenticated;
grant execute on function public.set_form_maker_response_lock(uuid, boolean, text) to authenticated;
grant execute on function public.verify_form_maker_response_lock(uuid, text) to authenticated;
