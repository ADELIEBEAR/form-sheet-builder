import { createClient } from 'npm:@supabase/supabase-js@2.112.0'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

class HttpError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status = 500, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' } })
}

function normalizeKey(value: unknown) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

function fieldsOf(pages: unknown) {
  return Array.isArray(pages)
    ? pages.flatMap((page: any) => Array.isArray(page?.fields) ? page.fields : []).filter((field: any) => field?.type !== 'heading' && field?.id)
    : []
}

function semanticKind(field: any) {
  const label = normalizeKey(field?.label)
  if (field?.type === 'email' || /이메일|메일주소|email/.test(label)) return 'email'
  if (field?.type === 'phone' || /전화|연락처|휴대폰|핸드폰|phone|mobile|tel/.test(label)) return 'phone'
  if (field?.type === 'consent' || /개인정보.*동의|이용.*동의|consent/.test(label)) return 'consent'
  if (/이름|성명|닉네임|name/.test(label)) return 'name'
  return ''
}

const aliases: Record<string, string[]> = {
  name: ['name', '이름', '성명', '닉네임', '신청자이름'],
  phone: ['phone', 'tel', 'mobile', '전화번호', '연락처', '휴대폰', '핸드폰'],
  email: ['email', '이메일', '메일', '메일주소'],
  consent: ['consent', '동의', '개인정보동의', '개인정보수집및이용안내'],
}

function answerLookup(fields: any[]) {
  const lookup = new Map<string, any | null>()
  const add = (key: unknown, field: any) => {
    const normalized = normalizeKey(key)
    if (!normalized) return
    if (lookup.has(normalized) && lookup.get(normalized)?.id !== field.id) lookup.set(normalized, null)
    else lookup.set(normalized, field)
  }

  for (const field of fields) {
    add(field.id, field)
    add(field.label, field)
  }

  for (const [kind, names] of Object.entries(aliases)) {
    const candidates = fields.filter((field) => semanticKind(field) === kind)
    if (candidates.length === 1) names.forEach((name) => add(name, candidates[0]))
  }
  return lookup
}

function cleanValue(field: any, raw: unknown) {
  if (field.type === 'multi') {
    const values = Array.isArray(raw) ? raw : String(raw ?? '').split(',')
    return [...new Set(values.map((value) => String(value).trim().slice(0, 1000)).filter(Boolean))].slice(0, 50)
  }
  if (field.type === 'consent' && typeof raw === 'boolean') return raw ? '동의' : ''
  if (raw == null) return ''
  return String(raw).trim().slice(0, 10000)
}

function mapAnswers(fields: any[], input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError('answers는 질문명과 답변으로 이루어진 객체여야 합니다.', 400)
  const lookup = answerLookup(fields)
  const answers: Record<string, unknown> = Object.fromEntries(fields.map((field) => [field.id, field.type === 'multi' ? [] : '']))
  const unmapped: string[] = []
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = lookup.get(normalizeKey(key))
    if (!field) {
      unmapped.push(String(key).slice(0, 120))
      continue
    }
    answers[field.id] = cleanValue(field, raw)
  }
  if (JSON.stringify(answers).length > 200000) throw new HttpError('응답 내용이 너무 큽니다.', 413)
  return { answers, unmapped }
}

async function syncToBackup(supabaseUrl: string, anonKey: string, projectId: string, submissionId: string, syncKey: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/form-maker-sheet-sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ projectId, submissionId, syncKey }),
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) console.error('form-maker-sheet-sync failed', response.status, await response.text())
  } catch (error) {
    console.error('form-maker-sheet-sync failed', error)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'POST 요청만 사용할 수 있습니다.' }, 405)

  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > 220000) throw new HttpError('요청 내용이 너무 큽니다.', 413)
    const rawBody = await request.text()
    if (rawBody.length > 220000) throw new HttpError('요청 내용이 너무 큽니다.', 413)
    let body: any
    try { body = JSON.parse(rawBody) } catch { throw new HttpError('올바른 JSON 요청이 아닙니다.', 400) }

    if (String(body?.website || '').trim()) return json({ ok: true })
    const requestUrl = new URL(request.url)
    const form = String(body?.form || body?.slug || requestUrl.searchParams.get('form') || '').trim().slice(0, 120)
    if (!form) throw new HttpError('form 주소값을 입력해 주세요.', 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!supabaseUrl || !serviceKey || !anonKey) throw new HttpError('서버 설정이 완료되지 않았습니다.', 500)
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

    let query = admin.from('form_maker_projects').select('id,title,slug,status,pages').eq('status', 'published')
    query = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(form) ? query.eq('id', form) : query.eq('slug', form)
    const { data: project, error: projectError } = await query.maybeSingle()
    if (projectError) throw projectError
    if (!project) throw new HttpError('게시 중인 폼을 찾을 수 없습니다. 폼 주소값과 게시 상태를 확인해 주세요.', 404)

    const fields = fieldsOf(project.pages)
    if (!fields.length) throw new HttpError('응답을 받을 질문이 없는 폼입니다.', 400)
    const mapped = mapAnswers(fields, body?.answers)
    if (body?.dryRun === true) {
      return json({ ok: true, dryRun: true, form: { id: project.id, title: project.title, slug: project.slug }, mappedAnswers: mapped.answers, unmapped: mapped.unmapped })
    }

    const submissionId = crypto.randomUUID()
    const syncKey = crypto.randomUUID()
    const source = String(body?.source || request.headers.get('origin') || '외부 사이트').trim().slice(0, 160)
    const metadata = {
      integration: 'external-site',
      source,
      origin: String(request.headers.get('origin') || '').slice(0, 300),
      unmapped: mapped.unmapped.slice(0, 30),
    }
    const { data: submission, error: insertError } = await admin
      .from('form_maker_submissions')
      .insert({ id: submissionId, project_id: project.id, answers: mapped.answers, metadata, sync_key: syncKey, sheet_sync_status: 'pending' })
      .select('id,quality_status,quality_reasons')
      .single()
    if (insertError) throw insertError

    EdgeRuntime.waitUntil(syncToBackup(supabaseUrl, anonKey, project.id, submission.id, syncKey))
    return json({ ok: true, id: submission.id, qualityStatus: submission.quality_status, qualityReasons: submission.quality_reasons || [], sheetSyncStatus: 'pending', unmapped: mapped.unmapped }, 201)
  } catch (error) {
    console.error(error)
    if (error instanceof HttpError) return json({ error: error.message, details: error.details }, error.status)
    return json({ error: '응답을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500)
  }
})
