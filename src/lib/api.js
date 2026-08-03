import { ASSET_BUCKET, supabase } from './supabase'
import { sanitizeForm, validateAnswers, ValidationError } from './validation'

export class ApiError extends Error {
  constructor(message, status = 500, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

function fail(error, fallback = '요청을 처리하지 못했습니다.') {
  if (error instanceof ApiError) throw error
  throw new ApiError(error?.message || fallback, 500, error)
}

function parseBody(options) {
  if (!options?.body || options.body instanceof FormData) return options?.body
  if (typeof options.body === 'string') {
    try { return JSON.parse(options.body) } catch { return {} }
  }
  return options.body
}

function serializeForm(row) {
  const countRelation = row.form_builder_responses
  const responseCount = Array.isArray(countRelation) ? Number(countRelation[0]?.count || 0) : Number(row.response_count || 0)
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || '',
    slug: row.slug,
    questions: row.questions || [],
    theme: row.theme || {},
    successMessage: row.success_message || '응답이 제출되었습니다.',
    isPublished: Boolean(row.is_published),
    sheetId: row.sheet_id || '',
    sheetUrl: row.sheet_url || '',
    sheetName: row.sheet_name || '응답',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responseCount,
  }
}

function serializeResponse(row) {
  return {
    id: row.id,
    formId: row.form_id,
    answers: row.answers || {},
    sheetSyncStatus: row.sheet_sync_status || 'not_connected',
    sheetSyncError: row.sheet_sync_error || '',
    submittedAt: row.submitted_at,
  }
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new ApiError('로그인이 필요합니다.', 401, error)
  return data.user
}

async function ownedForm(id) {
  const { data, error } = await supabase.from('form_builder_forms').select('*').eq('id', id).single()
  if (error || !data) throw new ApiError('폼을 찾을 수 없습니다.', error?.code === 'PGRST116' ? 404 : 500, error)
  return data
}

function providerToken() {
  return window.localStorage.getItem('form_builder_google_provider_token') || ''
}

async function googleFetch(path, options = {}) {
  const token = providerToken()
  if (!token) throw new ApiError('Google Sheets 권한이 없습니다. 로그아웃한 뒤 Google로 다시 로그인해 주세요.', 401)
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(body?.error?.message || 'Google Sheets 요청에 실패했습니다.', response.status, body)
  return body
}

async function writeSheetHeader(form) {
  if (!form.sheetId) return
  const sheetName = form.sheetName || '응답'
  const headers = ['제출 시각', ...form.questions.filter((question) => question.type !== 'notice').map((question) => question.label)]
  await googleFetch(`spreadsheets/${encodeURIComponent(form.sheetId)}/values/${encodeURIComponent(`${sheetName}!A1`)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ range: `${sheetName}!A1`, majorDimension: 'ROWS', values: [headers] }),
  })
}

async function connectSheet(formId, input) {
  const row = await ownedForm(formId)
  let sheet
  if (input.action === 'create') {
    const created = await googleFetch('spreadsheets', {
      method: 'POST',
      body: JSON.stringify({ properties: { title: `${row.title} - 응답` }, sheets: [{ properties: { title: '응답' } }] }),
    })
    sheet = { id: created.spreadsheetId, url: created.spreadsheetUrl, name: created.sheets?.[0]?.properties?.title || '응답' }
  } else {
    const raw = String(input.sheetId || '').trim()
    const id = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || raw
    if (!/^[a-zA-Z0-9-_]{20,}$/.test(id)) throw new ApiError('Google Sheet 주소 또는 ID를 확인해 주세요.', 400)
    const found = await googleFetch(`spreadsheets/${encodeURIComponent(id)}?fields=spreadsheetId,spreadsheetUrl,sheets.properties.title`)
    sheet = { id: found.spreadsheetId, url: found.spreadsheetUrl, name: found.sheets?.[0]?.properties?.title || '응답' }
  }
  const { data, error } = await supabase.from('form_builder_forms').update({
    sheet_id: sheet.id,
    sheet_url: sheet.url,
    sheet_name: sheet.name,
    updated_at: new Date().toISOString(),
  }).eq('id', formId).select().single()
  if (error) fail(error)
  const form = serializeForm(data)
  await writeSheetHeader(form)
  return { form }
}

async function invokeSheetSync(formId, responseId) {
  const { data, error } = await supabase.functions.invoke('form-builder-sheet-sync', {
    body: { formId, responseId },
  })
  if (error) throw new ApiError(error.message || 'Google Sheets 동기화에 실패했습니다.', 500, error)
  if (data?.error) throw new ApiError(data.error, 500, data)
  return data
}

async function syncPendingResponses(forms) {
  const connectedIds = forms.filter((form) => form.sheetId).map((form) => form.id)
  if (!connectedIds.length) return
  const { data } = await supabase.from('form_builder_responses')
    .select('id,form_id')
    .in('form_id', connectedIds)
    .eq('sheet_sync_status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(20)
  for (const response of data || []) {
    await invokeSheetSync(response.form_id, response.id).catch(() => {})
  }
}

function assetPathFromUrl(url) {
  const marker = `/storage/v1/object/public/${ASSET_BUCKET}/`
  const index = String(url || '').indexOf(marker)
  return index < 0 ? '' : decodeURIComponent(String(url).slice(index + marker.length))
}

async function handleUpload(formData) {
  const user = await requireUser()
  const file = formData?.get('file')
  if (!(file instanceof File)) throw new ApiError('이미지 파일이 필요합니다.', 400)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new ApiError('JPG, PNG, WebP 이미지만 올릴 수 있습니다.', 400)
  if (file.size > 5 * 1024 * 1024) throw new ApiError('이미지는 5MB 이하여야 합니다.', 413)
  const formId = String(formData.get('formId') || 'drafts')
  const path = `${user.id}/${formId}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (error) fail(error, '이미지 업로드에 실패했습니다.')
  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path)
  const oldPath = assetPathFromUrl(formData.get('oldUrl'))
  if (oldPath && oldPath.startsWith(`${user.id}/`)) await supabase.storage.from(ASSET_BUCKET).remove([oldPath]).catch(() => {})
  return { url: data.publicUrl }
}

export async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const body = parseBody(options)

  try {
    if (path === '/api/me' && method === 'GET') {
      const user = await requireUser()
      return { user: { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.user_metadata?.name || user.email, avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '' } }
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      const { error } = await supabase.auth.signOut()
      if (error) fail(error)
      return null
    }

    if (path === '/api/forms' && method === 'GET') {
      const user = await requireUser()
      const { data, error } = await supabase.from('form_builder_forms')
        .select('*, form_builder_responses(count)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) fail(error)
      const forms = (data || []).map(serializeForm)
      await syncPendingResponses(forms)
      return { forms }
    }

    if (path === '/api/forms' && method === 'POST') {
      const user = await requireUser()
      const input = sanitizeForm(body)
      const payload = { ...input, user_id: user.id }
      let result = await supabase.from('form_builder_forms').insert(payload).select().single()
      if (result.error?.code === '23505') result = await supabase.from('form_builder_forms').insert({ ...payload, slug: `${input.slug}-${crypto.randomUUID().slice(0, 6)}` }).select().single()
      if (result.error) fail(result.error)
      return { form: serializeForm(result.data) }
    }

    const publicFormMatch = path.match(/^\/api\/public\/forms\/([^/]+)$/)
    if (publicFormMatch && method === 'GET') {
      const slug = decodeURIComponent(publicFormMatch[1])
      const { data, error } = await supabase.from('form_builder_forms').select('*').eq('slug', slug).eq('is_published', true).single()
      if (error || !data) throw new ApiError('게시되지 않았거나 존재하지 않는 폼입니다.', 404, error)
      return { form: serializeForm(data) }
    }

    const publicResponseMatch = path.match(/^\/api\/public\/forms\/([^/]+)\/responses$/)
    if (publicResponseMatch && method === 'POST') {
      if (body?.website) return { ok: true }
      if (Number(body?.startedAt) && Date.now() - Number(body.startedAt) < 1200) throw new ApiError('너무 빠르게 제출했습니다. 내용을 확인해 주세요.', 400)
      const slug = decodeURIComponent(publicResponseMatch[1])
      const { data: row, error: formError } = await supabase.from('form_builder_forms').select('*').eq('slug', slug).eq('is_published', true).single()
      if (formError || !row) throw new ApiError('게시되지 않았거나 존재하지 않는 폼입니다.', 404, formError)
      const form = serializeForm(row)
      const responseId = crypto.randomUUID()
      const status = form.sheetId ? 'pending' : 'not_connected'
      const answers = validateAnswers(form.questions, body?.answers)
      const { error } = await supabase.from('form_builder_responses').insert({ id: responseId, form_id: form.id, answers, sheet_sync_status: status })
      if (error) fail(error, '응답을 저장하지 못했습니다.')
      return { ok: true, id: responseId }
    }

    if (path === '/api/uploads' && method === 'POST') return handleUpload(body)

    const responseListMatch = path.match(/^\/api\/forms\/([^/]+)\/responses$/)
    if (responseListMatch && method === 'GET') {
      await ownedForm(responseListMatch[1])
      const { data, error } = await supabase.from('form_builder_responses').select('*').eq('form_id', responseListMatch[1]).order('submitted_at', { ascending: false }).limit(5000)
      if (error) fail(error)
      return { responses: (data || []).map(serializeResponse) }
    }

    const retryMatch = path.match(/^\/api\/forms\/([^/]+)\/responses\/([^/]+)\/retry$/)
    if (retryMatch && method === 'POST') {
      await ownedForm(retryMatch[1])
      await invokeSheetSync(retryMatch[1], retryMatch[2])
      const { data, error } = await supabase.from('form_builder_responses').select('*').eq('id', retryMatch[2]).single()
      if (error) fail(error)
      return { response: serializeResponse(data) }
    }

    const sheetMatch = path.match(/^\/api\/forms\/([^/]+)\/sheet$/)
    if (sheetMatch && method === 'POST') return connectSheet(sheetMatch[1], body || {})

    const duplicateMatch = path.match(/^\/api\/forms\/([^/]+)\/duplicate$/)
    if (duplicateMatch && method === 'POST') {
      const user = await requireUser()
      const current = await ownedForm(duplicateMatch[1])
      const id = crypto.randomUUID()
      const { data, error } = await supabase.from('form_builder_forms').insert({
        user_id: user.id,
        title: `${current.title} 복사본`,
        description: current.description,
        slug: `${current.slug}-copy-${id.slice(0, 5)}`,
        questions: current.questions,
        theme: current.theme,
        success_message: current.success_message,
        is_published: false,
      }).select().single()
      if (error) fail(error)
      return { form: serializeForm(data) }
    }

    const formMatch = path.match(/^\/api\/forms\/([^/]+)$/)
    if (formMatch && method === 'GET') return { form: serializeForm(await ownedForm(formMatch[1])) }

    if (formMatch && method === 'PUT') {
      const input = sanitizeForm(body)
      const { data, error } = await supabase.from('form_builder_forms').update(input).eq('id', formMatch[1]).select().single()
      if (error?.code === '23505') throw new ApiError('이미 사용 중인 공개 주소입니다.', 409, error)
      if (error) fail(error)
      const form = serializeForm(data)
      if (form.sheetId) writeSheetHeader(form).catch(() => {})
      return { form }
    }

    if (formMatch && method === 'DELETE') {
      const current = await ownedForm(formMatch[1])
      const { error } = await supabase.from('form_builder_forms').delete().eq('id', formMatch[1])
      if (error) fail(error)
      const pathToDelete = assetPathFromUrl(current.theme?.coverUrl)
      if (pathToDelete) await supabase.storage.from(ASSET_BUCKET).remove([pathToDelete]).catch(() => {})
      return null
    }

    throw new ApiError('지원하지 않는 요청입니다.', 404)
  } catch (error) {
    if (error instanceof ValidationError) throw new ApiError(error.message, 400, error)
    fail(error)
  }
}

export function downloadCsv(filename, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = `\uFEFF${rows.map((row) => row.map(escape).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
