create table public.form_maker_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 폼',
  slug text not null unique,
  description text not null default '',
  pages jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{"accent":"#3157e8","background":"#eef1f8","card":"#ffffff","text":"#1e2430","radius":18,"coverUrl":"","showProgress":true}'::jsonb,
  settings jsonb not null default '{"successTitle":"응답이 접수되었습니다","successMessage":"참여해 주셔서 감사합니다.","submitLabel":"제출하기"}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sheet_id text,
  sheet_url text,
  sheet_name text not null default '응답',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_maker_pages_array check (jsonb_typeof(pages) = 'array'),
  constraint form_maker_pages_size check (octet_length(pages::text) <= 500000),
  constraint form_maker_no_inline_page_images check (pages::text not ilike '%data:image/%'),
  constraint form_maker_no_inline_theme_images check (theme::text not ilike '%data:image/%')
);

create index form_maker_projects_owner_updated_idx on public.form_maker_projects (owner_id, updated_at desc);
create index form_maker_projects_slug_status_idx on public.form_maker_projects (slug, status);

create table public.form_maker_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.form_maker_projects(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  sync_key uuid not null default gen_random_uuid(),
  sheet_sync_status text not null default 'not_connected' check (sheet_sync_status in ('not_connected', 'pending', 'synced', 'failed')),
  sheet_sync_error text,
  submitted_at timestamptz not null default now(),
  constraint form_maker_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint form_maker_answers_size check (octet_length(answers::text) <= 200000)
);

create index form_maker_submissions_project_submitted_idx on public.form_maker_submissions (project_id, submitted_at desc);
create index form_maker_submissions_pending_idx on public.form_maker_submissions (project_id, sheet_sync_status) where sheet_sync_status in ('pending', 'failed');

create table public.form_maker_google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_form_maker_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and old.status <> 'published' then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger form_maker_projects_updated_at
before update on public.form_maker_projects
for each row execute function public.set_form_maker_updated_at();

alter table public.form_maker_projects enable row level security;
alter table public.form_maker_submissions enable row level security;
alter table public.form_maker_google_tokens enable row level security;

grant select on public.form_maker_projects to anon, authenticated;
grant insert, update, delete on public.form_maker_projects to authenticated;
grant insert on public.form_maker_submissions to anon, authenticated;
grant select, update, delete on public.form_maker_submissions to authenticated;
grant select, insert, update, delete on public.form_maker_google_tokens to authenticated;

create policy "form maker published projects are public"
on public.form_maker_projects for select to anon
using (status = 'published');

create policy "form maker owners read projects"
on public.form_maker_projects for select to authenticated
using ((select auth.uid()) = owner_id or status = 'published');

create policy "form maker owners create projects"
on public.form_maker_projects for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "form maker owners update projects"
on public.form_maker_projects for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "form maker owners delete projects"
on public.form_maker_projects for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "form maker accepts published submissions"
on public.form_maker_submissions for insert to anon, authenticated
with check (
  exists (
    select 1 from public.form_maker_projects project
    where project.id = project_id and project.status = 'published'
  )
);

create policy "form maker owners read submissions"
on public.form_maker_submissions for select to authenticated
using (
  exists (
    select 1 from public.form_maker_projects project
    where project.id = project_id and project.owner_id = (select auth.uid())
  )
);

create policy "form maker owners update submissions"
on public.form_maker_submissions for update to authenticated
using (
  exists (
    select 1 from public.form_maker_projects project
    where project.id = project_id and project.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.form_maker_projects project
    where project.id = project_id and project.owner_id = (select auth.uid())
  )
);

create policy "form maker owners delete submissions"
on public.form_maker_submissions for delete to authenticated
using (
  exists (
    select 1 from public.form_maker_projects project
    where project.id = project_id and project.owner_id = (select auth.uid())
  )
);

create policy "form maker users read own google token"
on public.form_maker_google_tokens for select to authenticated
using ((select auth.uid()) = user_id);

create policy "form maker users create own google token"
on public.form_maker_google_tokens for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "form maker users update own google token"
on public.form_maker_google_tokens for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "form maker users delete own google token"
on public.form_maker_google_tokens for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-maker-assets', 'form-maker-assets', true, 5242880, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "form maker users upload assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'form-maker-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "form maker users read own assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'form-maker-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "form maker users update own assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'form-maker-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'form-maker-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "form maker users delete own assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'form-maker-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
