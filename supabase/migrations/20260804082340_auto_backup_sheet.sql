create table if not exists public.form_maker_backup_sheets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sheet_id text not null,
  sheet_url text not null,
  sheet_title text not null default '폼메이커 응답 백업',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_maker_backup_sheet_id_not_blank check (btrim(sheet_id) <> ''),
  constraint form_maker_backup_sheet_url_not_blank check (btrim(sheet_url) <> '')
);

alter table public.form_maker_backup_sheets enable row level security;

revoke all on table public.form_maker_backup_sheets from anon, authenticated;
grant select on table public.form_maker_backup_sheets to authenticated;

drop policy if exists "form maker users read own backup sheet" on public.form_maker_backup_sheets;
create policy "form maker users read own backup sheet"
on public.form_maker_backup_sheets
for select
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.form_maker_backup_sheets is
  'One automatically managed Google Sheets backup workbook per form maker owner.';
comment on column public.form_maker_backup_sheets.sheet_id is
  'Google spreadsheet ID. Writes are restricted to service-role Edge Functions.';
