grant insert, update on public.form_maker_project_meta to authenticated;

drop policy if exists "form maker owners insert project meta" on public.form_maker_project_meta;
create policy "form maker owners insert project meta"
on public.form_maker_project_meta for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.form_maker_projects as project
    where project.id = project_id
      and project.owner_id = (select auth.uid())
  )
);

drop policy if exists "form maker owners update project meta" on public.form_maker_project_meta;
create policy "form maker owners update project meta"
on public.form_maker_project_meta for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.form_maker_projects as project
    where project.id = project_id
      and project.owner_id = (select auth.uid())
  )
);

create or replace function public.set_form_maker_project_meta_v2(
  target_project_id uuid,
  new_folder text default '',
  new_memo text default '',
  new_memo_color text default 'lemon'
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_owner uuid;
  safe_memo_color text;
begin
  select project.owner_id
  into current_owner
  from public.form_maker_projects as project
  where project.id = target_project_id
    and project.owner_id = auth.uid();

  if current_owner is null then
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
