alter table public.form_maker_submissions
add column if not exists sync_key uuid not null default gen_random_uuid();
