alter table public.form_maker_submissions
  add column if not exists quality_status text not null default 'normal',
  add column if not exists quality_reasons jsonb not null default '[]'::jsonb,
  add column if not exists answer_fingerprint text,
  add column if not exists identity_fingerprint text,
  add column if not exists duplicate_of uuid,
  add column if not exists quality_source text not null default 'auto',
  add column if not exists quality_reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'form_maker_quality_status_check'
      and conrelid = 'public.form_maker_submissions'::regclass
  ) then
    alter table public.form_maker_submissions
      add constraint form_maker_quality_status_check
      check (quality_status in ('normal', 'duplicate', 'invalid'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'form_maker_quality_reasons_array'
      and conrelid = 'public.form_maker_submissions'::regclass
  ) then
    alter table public.form_maker_submissions
      add constraint form_maker_quality_reasons_array
      check (jsonb_typeof(quality_reasons) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'form_maker_quality_source_check'
      and conrelid = 'public.form_maker_submissions'::regclass
  ) then
    alter table public.form_maker_submissions
      add constraint form_maker_quality_source_check
      check (quality_source in ('auto', 'manual'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'form_maker_duplicate_of_fkey'
      and conrelid = 'public.form_maker_submissions'::regclass
  ) then
    alter table public.form_maker_submissions
      add constraint form_maker_duplicate_of_fkey
      foreign key (duplicate_of)
      references public.form_maker_submissions(id)
      on delete set null;
  end if;
end $$;

create index if not exists form_maker_submissions_quality_idx
  on public.form_maker_submissions (project_id, quality_status, submitted_at desc);

create index if not exists form_maker_submissions_identity_fingerprint_idx
  on public.form_maker_submissions (project_id, identity_fingerprint, submitted_at)
  where identity_fingerprint is not null;

create index if not exists form_maker_submissions_answer_fingerprint_idx
  on public.form_maker_submissions (project_id, answer_fingerprint, submitted_at)
  where answer_fingerprint is not null;

create index if not exists form_maker_submissions_duplicate_of_idx
  on public.form_maker_submissions (duplicate_of)
  where duplicate_of is not null;

create schema if not exists private;

create or replace function private.classify_form_maker_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_pages jsonb;
  field jsonb;
  field_id text;
  field_type text;
  field_label text;
  answer_value jsonb;
  answer_text text;
  phone_digits text;
  identity_parts text := '';
  reasons jsonb := '[]'::jsonb;
  meaningful_answers integer := 0;
  first_duplicate uuid;
  duplicate_by_identity boolean := false;
  duplicate_by_answer boolean := false;
  is_blank boolean;
  option_is_valid boolean;
begin
  select project.pages
  into project_pages
  from public.form_maker_projects as project
  where project.id = new.project_id;

  if project_pages is null then
    raise exception 'Form maker project does not exist.';
  end if;

  new.answer_fingerprint := md5(lower(regexp_replace(new.answers::text, '[[:space:]]+', '', 'g')));

  for field in
    select field_item
    from jsonb_array_elements(project_pages) as page_item
    cross join lateral jsonb_array_elements(coalesce(page_item -> 'fields', '[]'::jsonb)) as field_item
    where coalesce(field_item ->> 'type', '') <> 'heading'
  loop
    field_id := field ->> 'id';
    field_type := coalesce(field ->> 'type', 'short');
    field_label := left(coalesce(nullif(btrim(field ->> 'label'), ''), '이름 없는 질문'), 120);
    answer_value := new.answers -> field_id;
    answer_text := case
      when answer_value is null or answer_value = 'null'::jsonb then ''
      when jsonb_typeof(answer_value) = 'string' then btrim(answer_value #>> '{}')
      else btrim(answer_value::text, '"')
    end;
    is_blank := answer_value is null
      or answer_value = 'null'::jsonb
      or (jsonb_typeof(answer_value) = 'string' and answer_text = '')
      or (jsonb_typeof(answer_value) = 'array' and jsonb_array_length(answer_value) = 0);

    if not is_blank then
      meaningful_answers := meaningful_answers + 1;
    end if;

    if coalesce((field ->> 'required')::boolean, false) and is_blank then
      reasons := reasons || jsonb_build_array('필수 답변 누락 · ' || field_label);
      continue;
    end if;

    if is_blank then
      continue;
    end if;

    if field_type = 'email' then
      if answer_text !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        reasons := reasons || jsonb_build_array('이메일 형식 오류 · ' || field_label);
      else
        identity_parts := identity_parts || '|email:' || lower(answer_text);
      end if;
    elsif field_type = 'phone' then
      phone_digits := regexp_replace(answer_text, '[^0-9]', '', 'g');
      if char_length(phone_digits) < 8 or char_length(phone_digits) > 15 then
        reasons := reasons || jsonb_build_array('연락처 형식 오류 · ' || field_label);
      else
        identity_parts := identity_parts || '|phone:' || phone_digits;
      end if;
    elsif field_type = 'number' and answer_text !~ '^-?[0-9]+([.][0-9]+)?$' then
      reasons := reasons || jsonb_build_array('숫자 형식 오류 · ' || field_label);
    elsif field_type in ('single', 'select') then
      select exists (
        select 1
        from jsonb_array_elements_text(coalesce(field -> 'options', '[]'::jsonb)) as option_value
        where option_value = answer_text
      ) into option_is_valid;
      if not option_is_valid then
        reasons := reasons || jsonb_build_array('선택 항목 오류 · ' || field_label);
      end if;
    elsif field_type = 'rating' then
      if answer_text !~ '^[0-9]+$' then
        reasons := reasons || jsonb_build_array('평점 형식 오류 · ' || field_label);
      elsif answer_text::integer < 1
        or answer_text::integer > greatest(3, least(10, coalesce((field ->> 'scale')::integer, 5))) then
        reasons := reasons || jsonb_build_array('평점 범위 오류 · ' || field_label);
      end if;
    elsif field_type = 'consent'
      and coalesce((field ->> 'required')::boolean, false)
      and lower(answer_text) not in ('true', '1', 'yes', '동의') then
      reasons := reasons || jsonb_build_array('필수 동의 누락 · ' || field_label);
    end if;
  end loop;

  if meaningful_answers = 0 then
    reasons := reasons || jsonb_build_array('답변 내용이 비어 있음');
  end if;

  if (length(lower(new.answers::text)) - length(replace(lower(new.answers::text), 'http', ''))) / 4 > 3 then
    reasons := reasons || jsonb_build_array('링크가 비정상적으로 많음');
  end if;

  new.identity_fingerprint := case when identity_parts = '' then null else md5(identity_parts) end;

  perform pg_advisory_xact_lock(
    hashtext(new.project_id::text),
    hashtext(coalesce(new.identity_fingerprint, new.answer_fingerprint))
  );

  select submission.id,
    new.identity_fingerprint is not null and submission.identity_fingerprint = new.identity_fingerprint,
    submission.answer_fingerprint = new.answer_fingerprint
  into first_duplicate, duplicate_by_identity, duplicate_by_answer
  from public.form_maker_submissions as submission
  where submission.project_id = new.project_id
    and submission.quality_status <> 'invalid'
    and (
      (new.identity_fingerprint is not null and submission.identity_fingerprint = new.identity_fingerprint)
      or submission.answer_fingerprint = new.answer_fingerprint
    )
  order by submission.submitted_at asc
  limit 1;

  new.quality_source := 'auto';
  new.quality_reviewed_at := null;

  if jsonb_array_length(reasons) > 0 then
    new.quality_status := 'invalid';
    new.quality_reasons := reasons;
    new.duplicate_of := null;
  elsif first_duplicate is not null then
    new.quality_status := 'duplicate';
    new.quality_reasons := case
      when duplicate_by_identity then jsonb_build_array('동일한 이메일 또는 연락처가 이미 제출됨')
      when duplicate_by_answer then jsonb_build_array('동일한 답변이 이미 제출됨')
      else jsonb_build_array('중복 응답')
    end;
    new.duplicate_of := first_duplicate;
  else
    new.quality_status := 'normal';
    new.quality_reasons := '[]'::jsonb;
    new.duplicate_of := null;
  end if;

  return new;
end;
$$;

revoke all on function private.classify_form_maker_submission() from public, anon, authenticated, service_role;

drop trigger if exists form_maker_submissions_classify_quality on public.form_maker_submissions;
create trigger form_maker_submissions_classify_quality
before insert on public.form_maker_submissions
for each row execute function private.classify_form_maker_submission();

comment on column public.form_maker_submissions.quality_status is 'normal, duplicate, or invalid response classification';
comment on column public.form_maker_submissions.quality_reasons is 'Stable reasons produced automatically or by an administrator';
comment on column public.form_maker_submissions.answer_fingerprint is 'Non-security hash used only for exact-answer duplicate detection';
comment on column public.form_maker_submissions.identity_fingerprint is 'Non-security hash of normalized email and phone answers';
