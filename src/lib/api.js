import { ASSET_BUCKET, supabase } from './supabase'
import { sanitizeProject, validateAnswers, ValidationError } from './validation'

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

function bodyOf(options) {
  if (!options?.body || options.body instanceof FormData) return options?.body
  if (typeof options.body !== 'string') return options.body
  try { return JSON.parse(options.body) } catch { return {} }
}

function serializeProject(row) {
  const countRelation = row.form_maker_submissions
  const responseCount = Array.isArray(countRelation) ? Number(countRelation[0]?.count || 0) : Number(row.response_count || 0)
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    pages: row.pages || [],
    theme: row.theme || {},
    settings: row.settings || {},
    status: row.status || 'draft',
    sheetId: row.sheet_id || '',
    sheetUrl: row.sheet_url || '',
    sheetName: row.sheet_name || '응답',
    responseCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function serializeSubmission(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    answers: row.answers || {},
    sheetSyncStatus: row.sheet_sync_status || 'not_connected',
    sheetSyncError: row.sheet_sync_error || '',
    submittedAt: row.submitted_at,
  }
}

async function listSubmissions(projectId = '') {
  const submissions = []
  const pageSize = 1000
  const maximum = 20000
  for (let from = 0; from < maximum; from += pageSize) {
    let query = supabase.from('form_maker_submissions').select('*').order('submitted_at', { ascending: false }).range(from, from + pageSize - 1)
    if (projectId) query = query.eq('project_id', projectId)
    const { data, error } = await query
    if (error) fail(error)
    submissions.push(...(data || []).map(serializeSubmission))
    if (!data || data.length < pageSize) break
  }
  return submissions
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new ApiError('로그인이 필요합니다.', 401, error)
  return data.user
}

async function ownedProject(id) {
  const { data, error } = await supabase.from('form_maker_projects').select('*').eq('id', id).single()
  if (error || !data) throw new ApiError('폼을 찾을 수 없습니다.', error?.code === 'PGRST116' ? 404 : 500, error)
  return data
}

function providerToken() {
  return window.localStorage.getItem('form_maker_google_provider_token') || ''
}

async function googleFetch(path, options = {}) {
  const token = providerToken()
  if (!token) throw new ApiError('Google Sheets 권한이 없습니다. Google로 다시 로그인해 주세요.', 401)
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers || {}) },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = response.status === 401
      ? 'Google Sheets 권한이 만료되었습니다. Google 권한을 다시 연결해 주세요.'
      : result?.error?.message || 'Google Sheets 요청에 실패했습니다.'
    throw new ApiError(message, response.status, result)
  }
  return result
}

function sheetHeaders(project) {
  return ['제출 시각', ...project.pages.flatMap((page) => page.fields || []).filter((field) => field.type !== 'heading').map((field) => field.label)]
}

async function writeSheetHeader(project) {
  if (!project.sheetId) return
  const range = `${project.sheetName || '응답'}!A1`
  await googleFetch(`spreadsheets/${encodeURIComponent(project.sheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values: [sheetHeaders(project)] }),
  })
}

async function connectSheet(projectId, input) {
  const row = await ownedProject(projectId)
  let sheet
  if (input.action === 'create') {
    const created = await googleFetch('spreadsheets', {
      method: 'POST',
      body: JSON.stringify({ properties: { title: `${row.title} 응답` }, sheets: [{ properties: { title: '응답' } }] }),
    })
    sheet = { id: created.spreadsheetId, url: created.spreadsheetUrl, name: created.sheets?.[0]?.properties?.title || '응답' }
  } else {
    const raw = String(input.sheetId || '').trim()
    const id = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || raw
    if (!/^[a-zA-Z0-9-_]{20,}$/.test(id)) throw new ApiError('Google Sheet 주소 또는 ID를 확인해 주세요.', 400)
    const found = await googleFetch(`spreadsheets/${encodeURIComponent(id)}?fields=spreadsheetId,spreadsheetUrl,sheets.properties.title`)
    sheet = { id: found.spreadsheetId, url: found.spreadsheetUrl, name: found.sheets?.[0]?.properties?.title || '응답' }
  }
  const { data, error } = await supabase.from('form_maker_projects').update({ sheet_id: sheet.id, sheet_url: sheet.url, sheet_name: sheet.name }).eq('id', projectId).select().single()
  if (error) fail(error)
  const project = serializeProject(data)
  await writeSheetHeader(project)
  return { project }
}

function assetPath(url) {
  const marker = `/storage/v1/object/public/${ASSET_BUCKET}/`
  const index = String(url || '').indexOf(marker)
  return index < 0 ? '' : decodeURIComponent(String(url).slice(index + marker.length))
}

async function uploadAsset(formData) {
  const user = await requireUser()
  const file = formData.get('file')
  if (!(file instanceof Blob) || !file.type.startsWith('image/')) throw new ApiError('이미지 파일만 업로드할 수 있습니다.', 400)
  if (file.size > 5 * 1024 * 1024) throw new ApiError('이미지는 5MB 이하로 올려주세요.', 413)
  const path = `${user.id}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, { contentType: 'image/webp', upsert: false })
  if (error) fail(error, '이미지를 업로드하지 못했습니다.')
  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path)
  const oldPath = assetPath(formData.get('oldUrl'))
  if (oldPath?.startsWith(`${user.id}/`)) supabase.storage.from(ASSET_BUCKET).remove([oldPath]).catch(() => {})
  return { url: data.publicUrl }
}

async function invokeSheetSync(projectId, submissionId, syncKey) {
  const { data, error } = await supabase.functions.invoke('form-maker-sheet-sync', { body: { projectId, submissionId, syncKey } })
  if (error) throw new ApiError(error.message || 'Google Sheets 동기화에 실패했습니다.', 500, error)
  if (!data?.ok) throw new ApiError(data?.error || 'Google Sheets 동기화에 실패했습니다.', 500, data)
  return data
}

export async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const body = bodyOf(options)
  try {
    if (path === '/maker/projects' && method === 'GET') {
      await requireUser()
      const { data, error } = await supabase.from('form_maker_projects').select('*, form_maker_submissions(count)').order('updated_at', { ascending: false })
      if (error) fail(error)
      return { projects: (data || []).map(serializeProject) }
    }

    if (path === '/maker/projects' && method === 'POST') {
      const user = await requireUser()
      const input = sanitizeProject(body)
      const { data, error } = await supabase.from('form_maker_projects').insert({ ...input, owner_id: user.id }).select().single()
      if (error?.code === '23505') throw new ApiError('이미 사용 중인 공개 주소입니다.', 409, error)
      if (error) fail(error)
      return { project: serializeProject(data) }
    }

    if (path === '/maker/submissions' && method === 'GET') {
      await requireUser()
      return { submissions: await listSubmissions() }
    }

    const publicMatch = path.match(/^\/maker\/public\/([^/]+)$/)
    if (publicMatch && method === 'GET') {
      const { data, error } = await supabase.from('form_maker_projects').select('*').eq('slug', decodeURIComponent(publicMatch[1])).eq('status', 'published').single()
      if (error || !data) throw new ApiError('공개되지 않았거나 존재하지 않는 폼입니다.', 404, error)
      return { project: serializeProject(data) }
    }

    const publicSubmitMatch = path.match(/^\/maker\/public\/([^/]+)\/submissions$/)
    if (publicSubmitMatch && method === 'POST') {
      if (body?.website) throw new ApiError('올바르지 않은 제출입니다.', 400)
      if (!Number.isFinite(Number(body?.startedAt)) || Date.now() - Number(body.startedAt) < 1200) throw new ApiError('너무 빠르게 제출되었습니다. 내용을 확인해 주세요.', 400)
      const { data: row, error: findError } = await supabase.from('form_maker_projects').select('*').eq('slug', decodeURIComponent(publicSubmitMatch[1])).eq('status', 'published').single()
      if (findError || !row) throw new ApiError('공개되지 않았거나 존재하지 않는 폼입니다.', 404, findError)
      const answers = validateAnswers(row.pages || [], body?.answers)
      const submissionId = crypto.randomUUID()
      const syncKey = crypto.randomUUID()
      const { error } = await supabase.from('form_maker_submissions').insert({ id: submissionId, project_id: row.id, answers, sync_key: syncKey, sheet_sync_status: row.sheet_id ? 'pending' : 'not_connected' })
      if (error) fail(error, '응답을 저장하지 못했습니다.')
      if (row.sheet_id) invokeSheetSync(row.id, submissionId, syncKey).catch(() => {})
      return { ok: true, id: submissionId }
    }

    if (path === '/maker/assets' && method === 'POST') return uploadAsset(body)

    const submissionsMatch = path.match(/^\/maker\/projects\/([^/]+)\/submissions$/)
    if (submissionsMatch && method === 'GET') {
      await ownedProject(submissionsMatch[1])
      return { submissions: await listSubmissions(submissionsMatch[1]) }
    }

    const retryMatch = path.match(/^\/maker\/projects\/([^/]+)\/submissions\/([^/]+)\/sync$/)
    if (retryMatch && method === 'POST') {
      await ownedProject(retryMatch[1])
      await invokeSheetSync(retryMatch[1], retryMatch[2])
      const { data, error } = await supabase.from('form_maker_submissions').select('*').eq('id', retryMatch[2]).single()
      if (error) fail(error)
      return { submission: serializeSubmission(data) }
    }

    const sheetMatch = path.match(/^\/maker\/projects\/([^/]+)\/sheet$/)
    if (sheetMatch && method === 'POST') return connectSheet(sheetMatch[1], body || {})

    const duplicateMatch = path.match(/^\/maker\/projects\/([^/]+)\/duplicate$/)
    if (duplicateMatch && method === 'POST') {
      const user = await requireUser()
      const current = await ownedProject(duplicateMatch[1])
      const id = crypto.randomUUID()
      const { data, error } = await supabase.from('form_maker_projects').insert({
        owner_id: user.id,
        title: `${current.title} 복사본`,
        slug: `${current.slug}-copy-${id.slice(0, 5)}`,
        description: current.description,
        pages: current.pages,
        theme: current.theme,
        settings: current.settings,
        status: 'draft',
      }).select().single()
      if (error) fail(error)
      return { project: serializeProject(data) }
    }

    const projectMatch = path.match(/^\/maker\/projects\/([^/]+)$/)
    if (projectMatch && method === 'GET') return { project: serializeProject(await ownedProject(projectMatch[1])) }
    if (projectMatch && method === 'PUT') {
      const input = sanitizeProject(body)
      const { data, error } = await supabase.from('form_maker_projects').update(input).eq('id', projectMatch[1]).select().single()
      if (error?.code === '23505') throw new ApiError('이미 사용 중인 공개 주소입니다.', 409, error)
      if (error) fail(error)
      const project = serializeProject(data)
      if (project.sheetId) writeSheetHeader(project).catch(() => {})
      return { project }
    }
    if (projectMatch && method === 'DELETE') {
      const current = await ownedProject(projectMatch[1])
      const { error } = await supabase.from('form_maker_projects').delete().eq('id', projectMatch[1])
      if (error) fail(error)
      const oldPath = assetPath(current.theme?.coverUrl)
      if (oldPath) await supabase.storage.from(ASSET_BUCKET).remove([oldPath]).catch(() => {})
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
