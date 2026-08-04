import { createClient } from 'npm:@supabase/supabase-js@2.112.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BACKUP_SHEET_ID = Deno.env.get('FORM_MAKER_BACKUP_SHEET_ID') || '14BpX7cxcKVrw2LF0bQWW9CNjmBcY7HVj7HcQNaaSPL0'
const BACKUP_SHEET_URL = `https://docs.google.com/spreadsheets/d/${BACKUP_SHEET_ID}/edit`
const BACKUP_SHEET_TITLE = '백업'

class HttpError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' } })
}

type GoogleTokenRow = {
  access_token: string
  refresh_token?: string | null
  source: 'google_tokens' | 'form_maker_google_tokens'
}

type ProjectRow = {
  id: string
  owner_id: string
  title: string
  status: string
  pages: any[]
  sheet_id?: string | null
  sheet_url?: string | null
  sheet_name?: string | null
}

type BackupSheetRow = {
  user_id: string
  sheet_id: string
  sheet_url: string
  sheet_title: string
}

async function refreshGoogleAccessToken(admin: any, userId: string, tokenRow: GoogleTokenRow) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
  if (!tokenRow.refresh_token || !clientId || !clientSecret) return ''

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
    }),
  })
  const tokenData = await tokenResponse.json().catch(() => ({}))
  if (!tokenResponse.ok || typeof tokenData?.access_token !== 'string') return ''

  await admin.from(tokenRow.source).update({ access_token: tokenData.access_token, updated_at: new Date().toISOString() }).eq('user_id', userId)
  return tokenData.access_token
}

async function googleRequest(admin: any, userId: string, tokenRow: GoogleTokenRow, url: string, init: RequestInit) {
  const request = (accessToken: string) => fetch(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${accessToken}` },
  })
  const firstResponse = await request(tokenRow.access_token)
  if (firstResponse.status !== 401) return firstResponse

  const refreshedToken = await refreshGoogleAccessToken(admin, userId, tokenRow)
  if (!refreshedToken) return firstResponse
  tokenRow.access_token = refreshedToken
  return request(refreshedToken)
}

async function loadGoogleToken(admin: any, userId: string) {
  const { data: legacyToken, error: legacyError } = await admin
    .from('google_tokens')
    .select('access_token,refresh_token')
    .eq('user_id', userId)
    .maybeSingle()
  if (legacyError) throw legacyError
  if (legacyToken?.access_token) return { ...legacyToken, source: 'google_tokens' } as GoogleTokenRow

  const { data: makerToken, error: makerError } = await admin
    .from('form_maker_google_tokens')
    .select('access_token,refresh_token')
    .eq('user_id', userId)
    .maybeSingle()
  if (makerError) throw makerError
  if (makerToken?.access_token) return { ...makerToken, source: 'form_maker_google_tokens' } as GoogleTokenRow
  return null
}

async function googleError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}))
  if (response.status === 401 || response.status === 403) return new HttpError('Google 권한이 만료되었거나 시트 권한이 없습니다. Google 권한을 다시 승인해 주세요.', 401)
  return new HttpError(payload?.error?.message || fallback, response.status || 500)
}

function projectSheetName(project: ProjectRow) {
  const cleanTitle = String(project.title || '제목 없는 폼')
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96) || '제목 없는 폼'
  return `${cleanTitle}-응답`.slice(0, 100)
}

function uniqueProjectSheetName(project: ProjectRow, sheetTitles: Set<string>) {
  const preferred = projectSheetName(project)
  if (!sheetTitles.has(preferred)) return preferred

  const suffix = ` (${project.id.slice(0, 6)})`
  const base = preferred.slice(0, Math.max(1, 100 - suffix.length))
  let candidate = `${base}${suffix}`
  let attempt = 2
  while (sheetTitles.has(candidate)) {
    const numberedSuffix = ` (${project.id.slice(0, 6)}-${attempt})`
    candidate = `${preferred.slice(0, Math.max(1, 100 - numberedSuffix.length))}${numberedSuffix}`
    attempt += 1
  }
  return candidate
}

function quotedSheetName(sheetName: string) {
  return `'${sheetName.replaceAll("'", "''")}'`
}

function projectHeaders(project: ProjectRow) {
  const fields = Array.isArray(project.pages)
    ? project.pages.flatMap((page: any) => Array.isArray(page.fields) ? page.fields : []).filter((field: any) => field.type !== 'heading')
    : []
  return ['제출 시각', 'DB 판정', '판정 사유', ...fields.map((field: any) => String(field.label || ''))]
}

async function readBackupSheet(admin: any, project: ProjectRow, tokenRow: GoogleTokenRow, backup: BackupSheetRow) {
  const response = await googleRequest(
    admin,
    project.owner_id,
    tokenRow,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(backup.sheet_id)}?fields=spreadsheetId,spreadsheetUrl,sheets.properties(sheetId,title)`,
    { method: 'GET', headers: { 'content-type': 'application/json' } },
  )
  if (!response.ok) throw await googleError(response, '백업시트를 열지 못했습니다.')
  return response.json()
}

async function addProjectSheet(admin: any, project: ProjectRow, tokenRow: GoogleTokenRow, backup: BackupSheetRow, sheetName: string) {
  const response = await googleRequest(
    admin,
    project.owner_id,
    tokenRow,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(backup.sheet_id)}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
    },
  )
  if (!response.ok) throw await googleError(response, '폼 전용 시트 탭을 만들지 못했습니다.')
}

async function writeProjectHeader(admin: any, project: ProjectRow, tokenRow: GoogleTokenRow, backup: BackupSheetRow, sheetName: string) {
  const rowRange = `${quotedSheetName(sheetName)}!A1:ZZ1`
  const clearResponse = await googleRequest(
    admin,
    project.owner_id,
    tokenRow,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(backup.sheet_id)}/values/${encodeURIComponent(rowRange)}:clear`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
  )
  if (!clearResponse.ok) throw await googleError(clearResponse, '백업시트 제목 행을 정리하지 못했습니다.')

  const startRange = `${quotedSheetName(sheetName)}!A1`
  const headerResponse = await googleRequest(
    admin,
    project.owner_id,
    tokenRow,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(backup.sheet_id)}/values/${encodeURIComponent(startRange)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ range: startRange, majorDimension: 'ROWS', values: [projectHeaders(project)] }),
    },
  )
  if (!headerResponse.ok) throw await googleError(headerResponse, '백업시트 제목 행을 기록하지 못했습니다.')
}

async function ensureProjectBackupSheet(admin: any, project: ProjectRow, tokenRow: GoogleTokenRow) {
  const { data: assignedBackup, error: assignedBackupError } = await admin
    .from('form_maker_backup_sheets')
    .select('user_id,sheet_id,sheet_url,sheet_title')
    .eq('user_id', project.owner_id)
    .maybeSingle()
  if (assignedBackupError) throw assignedBackupError
  if (!assignedBackup || assignedBackup.sheet_id !== BACKUP_SHEET_ID) {
    throw new HttpError('이 계정의 백업 저장 위치가 아직 설정되지 않았습니다.', 409)
  }

  const backup: BackupSheetRow = {
    user_id: project.owner_id,
    sheet_id: BACKUP_SHEET_ID,
    sheet_url: BACKUP_SHEET_URL,
    sheet_title: BACKUP_SHEET_TITLE,
  }
  const workbook = await readBackupSheet(admin, project, tokenRow, backup)
  const { error: backupError } = await admin
    .from('form_maker_backup_sheets')
    .upsert({ ...backup, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (backupError) throw backupError

  const preservedName = project.sheet_id === BACKUP_SHEET_ID
    && project.sheet_name
    && project.sheet_name !== '응답'
    ? project.sheet_name
    : ''
  const sheetTitles = new Set<string>((workbook?.sheets || []).map((sheet: any) => String(sheet?.properties?.title || '')))
  const sheetName = preservedName || uniqueProjectSheetName(project, sheetTitles)
  const tabExists = sheetTitles.has(sheetName)
  if (!tabExists) await addProjectSheet(admin, project, tokenRow, backup, sheetName)
  await writeProjectHeader(admin, project, tokenRow, backup, sheetName)

  const { data: updatedProject, error: updateError } = await admin
    .from('form_maker_projects')
    .update({ sheet_id: backup.sheet_id, sheet_url: backup.sheet_url, sheet_name: sheetName })
    .eq('id', project.id)
    .eq('owner_id', project.owner_id)
    .select('*')
    .single()
  if (updateError) throw updateError
  return updatedProject as ProjectRow
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('authorization') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  if (!anonKey || !serviceKey || !supabaseUrl) return json({ error: 'Server configuration is incomplete.' }, 500)

  let submissionId = ''
  try {
    const body = await request.json()
    const action = body?.action === 'ensure' ? 'ensure' : 'sync'
    const projectId = String(body?.projectId || '')
    submissionId = String(body?.submissionId || '')
    const syncKey = String(body?.syncKey || '')
    const providerToken = String(body?.providerToken || '').slice(0, 8192)
    const providerRefreshToken = String(body?.providerRefreshToken || '').slice(0, 8192)
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuid.test(projectId) || (action === 'sync' && !uuid.test(submissionId))) throw new HttpError('Invalid request.', 400)

    let userId = ''
    if (authorization) {
      const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { authorization } } })
      const { data: { user } } = await authClient.auth.getUser()
      userId = user?.id || ''
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: project, error: projectError } = await admin
      .from('form_maker_projects')
      .select('id,owner_id,title,status,pages,sheet_id,sheet_url,sheet_name')
      .eq('id', projectId)
      .single()
    if (projectError || !project) throw new HttpError('폼을 찾을 수 없습니다.', 404)

    if (action === 'ensure') {
      if (!userId || project.owner_id !== userId) throw new HttpError('Forbidden', 403)
      if (providerToken) {
        const tokenPayload: Record<string, string> = {
          user_id: userId,
          access_token: providerToken,
          updated_at: new Date().toISOString(),
        }
        if (providerRefreshToken) tokenPayload.refresh_token = providerRefreshToken
        const { error: tokenSaveError } = await admin
          .from('form_maker_google_tokens')
          .upsert(tokenPayload, { onConflict: 'user_id' })
        if (tokenSaveError) throw tokenSaveError
      }
    }

    const tokenRow = await loadGoogleToken(admin, project.owner_id)
    if (!tokenRow?.access_token) throw new HttpError('Google 권한이 필요합니다. 한 번만 다시 로그인해 주세요.', 401)

    if (action === 'ensure') {
      const connectedProject = await ensureProjectBackupSheet(admin, project, tokenRow)
      return json({ ok: true, status: 'connected', project: connectedProject })
    }

    const { data: submission, error: submissionError } = await admin
      .from('form_maker_submissions')
      .select('id,project_id,answers,sync_key,sheet_sync_status,quality_status,quality_reasons,submitted_at')
      .eq('id', submissionId)
      .eq('project_id', projectId)
      .single()
    if (submissionError || !submission) throw new HttpError('응답을 찾을 수 없습니다.', 404)
    const ownerRequest = Boolean(userId) && project.owner_id === userId
    const publicSubmissionRequest = project.status === 'published' && uuid.test(syncKey) && submission.sync_key === syncKey
    if (!ownerRequest && !publicSubmissionRequest) throw new HttpError('Forbidden', 403)
    if (submission.sheet_sync_status === 'synced') return json({ ok: true, status: 'synced' })

    const connectedProject = await ensureProjectBackupSheet(admin, project, tokenRow)
    const fields = Array.isArray(connectedProject.pages)
      ? connectedProject.pages.flatMap((page: any) => Array.isArray(page.fields) ? page.fields : []).filter((field: any) => field.type !== 'heading')
      : []
    const answers = submission.answers && typeof submission.answers === 'object' ? submission.answers : {}
    const values = [
      new Date(submission.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      submission.quality_status === 'duplicate' ? '중복 DB' : submission.quality_status === 'invalid' ? '불량 DB' : '정상',
      Array.isArray(submission.quality_reasons) ? submission.quality_reasons.join(' · ') : '',
      ...fields.map((field: any) => {
        const value = answers[field.id]
        return Array.isArray(value) ? value.join(', ') : value ?? ''
      }),
    ]
    const sheetName = connectedProject.sheet_name || projectSheetName(connectedProject)
    const a1Range = `${quotedSheetName(sheetName)}!A:ZZ`
    const sheetResponse = await googleRequest(
      admin,
      connectedProject.owner_id,
      tokenRow,
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(connectedProject.sheet_id || '')}/values/${encodeURIComponent(a1Range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ range: a1Range, majorDimension: 'ROWS', values: [values] }),
      },
    )
    if (!sheetResponse.ok) throw await googleError(sheetResponse, `Google Sheets 오류 (${sheetResponse.status})`)

    await admin.from('form_maker_submissions').update({ sheet_sync_status: 'synced', sheet_sync_error: null }).eq('id', submission.id)
    return json({ ok: true, status: 'synced' })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (submissionId) {
      try {
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || ''
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        if (serviceKey && supabaseUrl) {
          const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
          await admin.from('form_maker_submissions').update({ sheet_sync_status: 'failed', sheet_sync_error: message.slice(0, 1000) }).eq('id', submissionId)
        }
      } catch { /* preserve the original sync error */ }
    }
    return json({ error: message }, status)
  }
})
