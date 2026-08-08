alter table public.form_maker_project_meta
add column if not exists memo_color text not null default 'lemon';

alter table public.form_maker_project_meta
drop constraint if exists form_maker_memo_color_allowed;

alter table public.form_maker_project_meta
add constraint form_maker_memo_color_allowed
check (memo_color in ('lemon', 'lavender', 'mint', 'sky', 'rose', 'sand', 'slate'));

create or replace function public.set_form_maker_project_meta_v2(
  target_project_id uuid,
  new_folder text default '',
  new_memo text default '',
  new_memo_color text default 'lemon'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
  safe_memo_color text;
begin
  select project.owner_id
  into current_owner
  from public.form_maker_projects as project
  where project.id = target_project_id;

  if current_owner is null or current_owner is distinct from auth.uid() then
    raise exception 'project_not_found_or_forbidden';
  end if;

  safe_memo_color := lower(trim(coalesce(new_memo_color, 'lemon')));
  if safe_memo_color not in ('lemon', 'lavender', 'mint', 'sky', 'rose', 'sand', 'slate') then
    safe_memo_color := 'lemon';
  end if;

  insert into public.form_maker_project_meta (project_id, owner_id, folder, memo, memo_color)
  values (
    target_project_id,
    current_owner,
    left(trim(coalesce(new_folder, '')), 80),
    left(coalesce(new_memo, ''), 2000),
    safe_memo_color
  )
  on conflict (project_id) do update set
    folder = excluded.folder,
    memo = excluded.memo,
    memo_color = excluded.memo_color,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.set_form_maker_project_meta_v2(uuid, text, text, text) from public, anon;
grant execute on function public.set_form_maker_project_meta_v2(uuid, text, text, text) to authenticated;
