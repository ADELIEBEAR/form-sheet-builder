create table public.form_maker_sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  form_project_id uuid references public.form_maker_projects(id) on delete set null,
  title text not null default '새 홍보 사이트',
  slug text not null unique,
  content jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_maker_sites_content_object check (jsonb_typeof(content) = 'object'),
  constraint form_maker_sites_theme_object check (jsonb_typeof(theme) = 'object'),
  constraint form_maker_sites_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint form_maker_sites_payload_size check (
    octet_length(content::text) <= 250000
    and octet_length(theme::text) <= 50000
    and octet_length(settings::text) <= 50000
  ),
  constraint form_maker_sites_no_inline_images check (
    content::text not ilike '%data:image/%'
    and theme::text not ilike '%data:image/%'
  )
);

create index form_maker_sites_owner_updated_idx
on public.form_maker_sites (owner_id, updated_at desc);

create index form_maker_sites_form_project_idx
on public.form_maker_sites (form_project_id)
where form_project_id is not null;

create index form_maker_sites_slug_status_idx
on public.form_maker_sites (slug, status);

create trigger form_maker_sites_updated_at
before update on public.form_maker_sites
for each row execute function public.set_form_maker_updated_at();

alter table public.form_maker_sites enable row level security;

grant select on public.form_maker_sites to anon, authenticated;
grant insert, update, delete on public.form_maker_sites to authenticated;
grant select, insert, update, delete on public.form_maker_sites to service_role;

create policy "form maker published sites are public"
on public.form_maker_sites for select to anon
using (status = 'published');

create policy "form maker owners read sites"
on public.form_maker_sites for select to authenticated
using ((select auth.uid()) = owner_id or status = 'published');

create policy "form maker owners create sites"
on public.form_maker_sites for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "form maker owners update sites"
on public.form_maker_sites for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "form maker owners delete sites"
on public.form_maker_sites for delete to authenticated
using ((select auth.uid()) = owner_id);
