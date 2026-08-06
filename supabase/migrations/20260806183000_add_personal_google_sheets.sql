create table if not exists public.form_maker_google_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  google_email text not null default '',
  access_secret_id uuid not null,
  refresh_secret_id uuid,
  scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_maker_google_email_size check (char_length(google_email) <= 320),
  constraint form_maker_google_scope_size check (char_length(scope) <= 2000)
);

create table if not exists public.form_maker_personal_sheets (
  project_id uuid primary key references public.form_maker_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  google_email text not null default '',
  sheet_id text not null,
  sheet_url text not null,
  sheet_title text not null,
  sheet_name text not null default '응답',
  columns jsonb not null default '[]'::jsonb,
  status text not null default 'connected' check (status in ('connected', 'reauthorize', 'error')),
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_maker_personal_sheet_id_not_blank check (btrim(sheet_id) <> ''),
  constraint form_maker_personal_sheet_url_not_blank check (btrim(sheet_url) <> ''),
  constraint form_maker_personal_sheet_columns_array check (jsonb_typeof(columns) = 'array'),
  constraint form_maker_personal_sheet_error_size check (char_length(last_error) <= 1000),
  unique (owner_id, sheet_id)
);

create index if not exists form_maker_personal_sheets_owner_idx
on public.form_maker_personal_sheets (owner_id, updated_at desc);

alter table public.form_maker_submissions
  add column if not exists personal_sheet_sync_status text not null default 'not_connected',
  add column if not exists personal_sheet_sync_error text;

alter table public.form_maker_submissions
  drop constraint if exists form_maker_submissions_personal_sheet_status_check;

alter table public.form_maker_submissions
  add constraint form_maker_submissions_personal_sheet_status_check
  check (personal_sheet_sync_status in ('not_connected', 'pending', 'synced', 'failed', 'reauthorize'));

create index if not exists form_maker_submissions_personal_pending_idx
on public.form_maker_submissions (project_id, personal_sheet_sync_status)
where personal_sheet_sync_status in ('pending', 'failed', 'reauthorize');

alter table public.form_maker_google_connections enable row level security;
alter table public.form_maker_google_connections force row level security;
alter table public.form_maker_personal_sheets enable row level security;
alter table public.form_maker_personal_sheets force row level security;

revoke all on table public.form_maker_google_connections from public, anon, authenticated;
revoke all on table public.form_maker_personal_sheets from public, anon, authenticated;
grant select, insert, update, delete on table public.form_maker_google_connections to service_role;
grant select, insert, update, delete on table public.form_maker_personal_sheets to service_role;

create or replace function public.form_maker_store_google_connection(
  target_owner_id uuid,
  new_access_token text,
  new_refresh_token text default null,
  new_google_email text default '',
  new_scope text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_connection public.form_maker_google_connections%rowtype;
  next_access_secret_id uuid;
  next_refresh_secret_id uuid;
  access_secret_name text := 'form-maker-google-access-' || target_owner_id::text;
  refresh_secret_name text := 'form-maker-google-refresh-' || target_owner_id::text;
begin
  if target_owner_id is null then
    raise exception 'owner id is required';
  end if;
  if new_access_token is null or btrim(new_access_token) = '' or char_length(new_access_token) > 10000 then
    raise exception 'invalid Google access token';
  end if;
  if new_refresh_token is not null and char_length(new_refresh_token) > 10000 then
    raise exception 'invalid Google refresh token';
  end if;

  select * into current_connection
  from public.form_maker_google_connections
  where owner_id = target_owner_id
  for update;

  if current_connection.access_secret_id is null then
    next_access_secret_id := vault.create_secret(
      new_access_token,
      access_secret_name,
      '폼메이커 Google Sheets 액세스 토큰'
    );
  else
    next_access_secret_id := current_connection.access_secret_id;
    perform vault.update_secret(
      next_access_secret_id,
      new_access_token,
      access_secret_name,
      '폼메이커 Google Sheets 액세스 토큰'
    );
  end if;

  next_refresh_secret_id := current_connection.refresh_secret_id;
  if new_refresh_token is not null and btrim(new_refresh_token) <> '' then
    if next_refresh_secret_id is null then
      next_refresh_secret_id := vault.create_secret(
        new_refresh_token,
        refresh_secret_name,
        '폼메이커 Google Sheets 새로고침 토큰'
      );
    else
      perform vault.update_secret(
        next_refresh_secret_id,
        new_refresh_token,
        refresh_secret_name,
        '폼메이커 Google Sheets 새로고침 토큰'
      );
    end if;
  end if;

  insert into public.form_maker_google_connections (
    owner_id,
    google_email,
    access_secret_id,
    refresh_secret_id,
    scope,
    updated_at
  ) values (
    target_owner_id,
    left(coalesce(nullif(btrim(new_google_email), ''), current_connection.google_email, ''), 320),
    next_access_secret_id,
    next_refresh_secret_id,
    left(coalesce(nullif(btrim(new_scope), ''), current_connection.scope, ''), 2000),
    now()
  )
  on conflict (owner_id) do update set
    google_email = excluded.google_email,
    access_secret_id = excluded.access_secret_id,
    refresh_secret_id = excluded.refresh_secret_id,
    scope = excluded.scope,
    updated_at = now();
end;
$$;

create or replace function public.form_maker_read_google_connection(target_owner_id uuid)
returns table (
  access_token text,
  refresh_token text,
  google_email text,
  granted_scope text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    access_secret.decrypted_secret,
    refresh_secret.decrypted_secret,
    connection.google_email,
    connection.scope
  from public.form_maker_google_connections as connection
  join vault.decrypted_secrets as access_secret
    on access_secret.id = connection.access_secret_id
  left join vault.decrypted_secrets as refresh_secret
    on refresh_secret.id = connection.refresh_secret_id
  where connection.owner_id = target_owner_id
  limit 1;
$$;

create or replace function public.form_maker_delete_google_connection(target_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_connection public.form_maker_google_connections%rowtype;
begin
  delete from public.form_maker_google_connections
  where owner_id = target_owner_id
  returning * into current_connection;

  if current_connection.access_secret_id is not null then
    delete from vault.secrets where id = current_connection.access_secret_id;
  end if;
  if current_connection.refresh_secret_id is not null then
    delete from vault.secrets where id = current_connection.refresh_secret_id;
  end if;
end;
$$;

revoke all on function public.form_maker_store_google_connection(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.form_maker_read_google_connection(uuid) from public, anon, authenticated;
revoke all on function public.form_maker_delete_google_connection(uuid) from public, anon, authenticated;
grant execute on function public.form_maker_store_google_connection(uuid, text, text, text, text) to service_role;
grant execute on function public.form_maker_read_google_connection(uuid) to service_role;
grant execute on function public.form_maker_delete_google_connection(uuid) to service_role;

comment on table public.form_maker_google_connections is
  'Server-only Google OAuth token references. Token values are encrypted in Supabase Vault.';
comment on table public.form_maker_personal_sheets is
  'One optional Google spreadsheet created in the form owner account for each form.';
comment on column public.form_maker_submissions.personal_sheet_sync_status is
  'Delivery state for the optional owner Google spreadsheet. Hidden master backup uses sheet_sync_status.';
