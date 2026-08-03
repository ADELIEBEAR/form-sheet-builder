create table public.form_builder_forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 폼',
  description text not null default '',
  slug text not null unique,
  questions jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{"accent":"#0f766e","surface":"#f3f7f6","coverUrl":""}'::jsonb,
  success_message text not null default '응답이 제출되었습니다.',
  is_published boolean not null default false,
  sheet_id text,
  sheet_url text,
  sheet_name text not null default '응답',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_builder_questions_array check (jsonb_typeof(questions) = 'array'),
  constraint form_builder_no_inline_question_images check (questions::text not ilike '%data:image/%'),
  constraint form_builder_no_inline_theme_images check (theme::text not ilike '%data:image/%')
);

create index form_builder_forms_user_updated_idx on public.form_builder_forms (user_id, updated_at desc);
create index form_builder_forms_slug_published_idx on public.form_builder_forms (slug, is_published);

create table public.form_builder_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.form_builder_forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  sheet_sync_status text not null default 'not_connected' check (sheet_sync_status in ('not_connected', 'pending', 'synced', 'failed')),
  sheet_sync_error text,
  submitted_at timestamptz not null default now()
);

create index form_builder_responses_form_submitted_idx on public.form_builder_responses (form_id, submitted_at desc);

alter table public.form_builder_forms enable row level security;
alter table public.form_builder_responses enable row level security;
grant select on public.form_builder_forms to anon, authenticated;
grant insert, update, delete on public.form_builder_forms to authenticated;
grant insert on public.form_builder_responses to anon, authenticated;
grant select, delete on public.form_builder_responses to authenticated;

create policy "published forms are publicly readable" on public.form_builder_forms for select to anon using (is_published = true);
create policy "owners can read their forms" on public.form_builder_forms for select to authenticated using ((select auth.uid()) = user_id or is_published = true);
create policy "owners can create forms" on public.form_builder_forms for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owners can update forms" on public.form_builder_forms for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owners can delete forms" on public.form_builder_forms for delete to authenticated using ((select auth.uid()) = user_id);
create policy "responses can be submitted to published forms" on public.form_builder_responses for insert to anon, authenticated with check (exists (select 1 from public.form_builder_forms f where f.id = form_id and f.is_published = true));
create policy "owners can read responses" on public.form_builder_responses for select to authenticated using (exists (select 1 from public.form_builder_forms f where f.id = form_id and f.user_id = (select auth.uid())));
create policy "owners can delete responses" on public.form_builder_responses for delete to authenticated using (exists (select 1 from public.form_builder_forms f where f.id = form_id and f.user_id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-builder-assets', 'form-builder-assets', true, 5242880, array['image/jpeg','image/png','image/webp']::text[]);

create policy "users upload form builder assets" on storage.objects for insert to authenticated
with check (bucket_id = 'form-builder-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own form builder assets" on storage.objects for update to authenticated
using (bucket_id = 'form-builder-assets' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'form-builder-assets' and owner_id = (select auth.uid())::text);
create policy "users delete own form builder assets" on storage.objects for delete to authenticated
using (bucket_id = 'form-builder-assets' and owner_id = (select auth.uid())::text);
