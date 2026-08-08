import { createClient } from 'npm:@supabase/supabase-js@2.112.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BACKUP_SCRIPT_URL = Deno.env.get('FORM_MAKER_BACKUP_SCRIPT_URL') || 'https://script.google.com/macros/s/AKfycby-KqvP9P5agWpkwa_GgH9xKaVQHzwbRZ_JerZOQ-fyHa1SpzRk5jZNSWfMCeg_LctKWw/exec'
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '827968184295-1eiuboa2tuqu61rft40v10d3gdcms6re.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

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

type ProjectRow = {
  id: string
  owner_id: string
  title: string
  status: string
  pages: any[]
}

type GoogleTokenRow = {
  access_token: string
  refresh_token?: string | null
  google_email?: string | null
  granted_scope?: string | null
}

type SheetColumn = {
  key: string
  label: string
}

type PersonalSheetRow = {
  project_id: string
  owner_id: string
  google_email: string
  sheet_id: string
  sheet_url: string
  sheet_title: string
  sheet_name: string
  columns: SheetColumn[]
  status: 'connected' | 'reauthorize' | 'error'
  last_error?: string | null
  last_synced_at?: string | null
  created_at?: string
  updated_at?: string
}

function projectFields(project: ProjectRow) {
  return Array.isArray(project.pages)
    ? project.pages.flatMap((page: any) => Array.isArray(page?.fields) ? page.fields : []).filter((field: any) => field?.type !== 'heading' && field?.id)
    : []
}

function sheetTitle(project: ProjectRow) {
  const clean = String(project.title || '제목 없는 폼').replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || '제목 없는 폼'
  return `${clean} 응답`
}

function quotedSheetName(name: string) {
  return `'${String(name || '응답').replaceAll("'", "''")}'`
}

function initialColumns(project: ProjectRow): SheetColumn[] {
  return [
    { key: '_submitted_at', label: '제출 시각' },
    { key: '_submission_id', label: '응답 ID' },
    { key: '_quality', label: 'DB 판정' },
    { key: '_quality_reason', label: '판정 사유' },
    ...projectFields(project).map((field: any) => ({ key: String(field.id), label: String(field.label || '질문') })),
  ]
}

function mergeColumns(project: ProjectRow, existing: unknown): SheetColumn[] {
  const source = Array.isArray(existing) ? existing : []
  const normalized = source
    .filter((item: any) => item && typeof item.key === 'string' && item.key)
    .map((item: any) => ({ key: String(item.key).slice(0, 120), label: String(item.label || '').slice(0, 300) }))
  const next = normalized.length ? normalized : initialColumns(project)
  const labels = new Map(initialColumns(project).map((column) => [column.key, column.label]))
  const keys = new Set(next.map((column) => column.key))
  const refreshed = next.map((column) => ({ ...column, label: labels.get(column.key) || column.label }))
  for (const column of initialColumns(project)) {
    if (!keys.has(column.key)) refreshed.push(column)
  }
  return refreshed.slice(0, 200)
}

function qualityLabel(submission: any) {
  if (submission.quality_status === 'duplicate') return '중복 DB'
  if (submission.quality_status === 'invalid') return '불량 DB'
  return '정상'
}

function answerRow(columns: SheetColumn[], submission: any) {
  const answers = submission.answers && typeof submission.answers === 'object' ? submission.answers : {}
  return columns.map((column) => {
    if (column.key === '_submitted_at') return new Date(submission.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    if (column.key === '_submission_id') return submission.id
    if (column.key === '_quality') return qualityLabel(submission)
    if (column.key === '_quality_reason') return Array.isArray(submission.quality_reasons) ? submission.quality_reasons.join(' · ') : ''
    const value = answers[column.key]
    return Array.isArray(value) ? value.join(', ') : value ?? ''
  })
}

async function googleError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}))
  if (response.status === 401) return new HttpError('Google 시트 권한이 만료되었습니다. 다시 연결해 주세요.', 401)
  if (response.status === 403) return new HttpError('Google 시트 편집 권한이 없거나 권한 승인이 필요합니다.', 403)
  if (response.status === 404) return new HttpError('Google 시트가 삭제되었거나 이동되었습니다.', 404)
  return new HttpError(payload?.error?.message || fallback, response.status || 500)
}

async function loadGoogleToken(admin: any, ownerId: string): Promise<GoogleTokenRow | null> {
  const { data, error } = await admin.rpc('form_maker_read_google_connection', { target_owner_id: ownerId })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row?.access_token ? row as GoogleTokenRow : null
}

async function storeGoogleToken(admin: any, ownerId: string, token: GoogleTokenRow) {
  const { error } = await admin.rpc('form_maker_store_google_connection', {
    target_owner_id: ownerId,
    new_access_token: token.access_token,
    new_refresh_token: token.refresh_token || null,
    new_google_email: token.google_email || '',
    new_scope: token.granted_scope || '',
  })
  if (error) throw error
}

async function refreshGoogleAccessToken(admin: any, ownerId: string, token: GoogleTokenRow) {
  if (!token.refresh_token || !GOOGLE_CLIENT_SECRET) return ''
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    }),
    signal: AbortSignal.timeout(12000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || typeof payload?.access_token !== 'string') return ''
  token.access_token = payload.access_token
  await storeGoogleToken(admin, ownerId, token)
  return payload.access_token
}

async function googleRequest(admin: any, ownerId: string, token: GoogleTokenRow, url: string, init: RequestInit) {
  const request = (accessToken: string) => fetch(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${accessToken}` },
    signal: init.signal || AbortSignal.timeout(15000),
  })
  const first = await request(token.access_token)
  if (first.status !== 401) return first
  const refreshed = await refreshGoogleAccessToken(admin, ownerId, token)
  return refreshed ? request(refreshed) : first
}

async function inspectProviderToken(accessToken: string, expectedEmail: string) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(10000) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new HttpError('Google 권한 정보를 확인하지 못했습니다. 다시 연결해 주세요.', 401)
  if (payload.aud && payload.aud !== GOOGLE_CLIENT_ID) throw new HttpError('이 앱에서 발급된 Google 권한이 아닙니다.', 403)
  const googleEmail = String(payload.email || expectedEmail || '').trim().toLowerCase()
  if (expectedEmail && googleEmail && googleEmail !== expectedEmail.toLowerCase()) throw new HttpError('로그인한 Google 계정과 시트 권한 계정이 다릅니다.', 403)
  const scope = String(payload.scope || '')
  if (!scope.split(/\s+/).some((item) => [GOOGLE_DRIVE_FILE_SCOPE, GOOGLE_SHEETS_SCOPE].includes(item))) {
    throw new HttpError('Google Drive 파일 권한이 필요합니다. 시트 연결을 다시 승인해 주세요.', 403)
  }
  return { googleEmail, scope }
}

async function writeHeader(admin: any, project: ProjectRow, token: GoogleTokenRow, sheetId: string, sheetName: string, columns: SheetColumn[]) {
  const range = `${quotedSheetName(sheetName)}!A1`
  const response = await googleRequest(
    admin,
    project.owner_id,
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values: [columns.map((column) => column.label)] }),
    },
  )
  if (!response.ok) throw await googleError(response, '개인 시트의 제목 행을 저장하지 못했습니다.')
}

async function createPersonalSheet(admin: any, project: ProjectRow, token: GoogleTokenRow): Promise<PersonalSheetRow> {
  const title = sheetTitle(project)
  const response = await googleRequest(
    admin,
    project.owner_id,
    token,
    'https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        properties: { title, locale: 'ko_KR', timeZone: 'Asia/Seoul' },
        sheets: [{ properties: { title: '응답', gridProperties: { frozenRowCount: 1 } } }],
      }),
    },
  )
  if (!response.ok) throw await googleError(response, '개인 Google 시트를 만들지 못했습니다.')
  const workbook = await response.json()
  const sheetId = String(workbook?.spreadsheetId || '')
  if (!sheetId) throw new HttpError('Google 시트 ID를 확인하지 못했습니다.', 502)
  const sheetName = String(workbook?.sheets?.[0]?.properties?.title || '응답')
  const numericSheetId = Number(workbook?.sheets?.[0]?.properties?.sheetId || 0)
  const columns = initialColumns(project)
  await writeHeader(admin, project, token, sheetId, sheetName, columns)

  const formatResponse = await googleRequest(
    admin,
    project.owner_id,
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requests: [
        { updateSheetProperties: { properties: { sheetId: numericSheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        { repeatCell: { range: { sheetId: numericSheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.40, green: 0.31, blue: 0.86 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }, verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat' } },
        { autoResizeDimensions: { dimensions: { sheetId: numericSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: columns.length } } },
      ] }),
    },
  )
  if (!formatResponse.ok) console.error('personal sheet formatting failed', formatResponse.status)

  const personalSheet = {
    project_id: project.id,
    owner_id: project.owner_id,
    google_email: token.google_email || '',
    sheet_id: sheetId,
    sheet_url: String(workbook?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`),
    sheet_title: String(workbook?.properties?.title || title),
    sheet_name: sheetName,
    columns,
    status: 'connected' as const,
    last_error: null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await admin.from('form_maker_personal_sheets').upsert(personalSheet, { onConflict: 'project_id' }).select('*').single()
  if (error) throw error
  return data as PersonalSheetRow
}

async function loadPersonalSheet(admin: any, projectId: string) {
  const { data, error } = await admin.from('form_maker_personal_sheets').select('*').eq('project_id', projectId).maybeSingle()
  if (error) throw error
  return data as PersonalSheetRow | null
}

function publicPersonalSheet(sheet: PersonalSheetRow | null) {
  if (!sheet) return null
  return {
    connected: true,
    googleEmail: sheet.google_email || '',
    sheetUrl: sheet.sheet_url,
    sheetTitle: sheet.sheet_title,
    status: sheet.status,
    lastError: sheet.last_error || '',
    lastSyncedAt: sheet.last_synced_at || '',
  }
}

async function ensurePersonalSheet(admin: any, project: ProjectRow, token: GoogleTokenRow) {
  const existing = await loadPersonalSheet(admin, project.id)
  if (!existing) return createPersonalSheet(admin, project, token)

  const response = await googleRequest(
    admin,
    project.owner_id,
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(existing.sheet_id)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title)`,
    { method: 'GET', headers: { 'content-type': 'application/json' } },
  )
  if (response.status === 404) return createPersonalSheet(admin, project, token)
  if (!response.ok) throw await googleError(response, '연결된 Google 시트를 열지 못했습니다.')
  const workbook = await response.json()
  const tabExists = (workbook?.sheets || []).some((sheet: any) => String(sheet?.properties?.title || '') === existing.sheet_name)
  if (!tabExists) throw new HttpError('연결된 시트의 응답 탭이 삭제되었습니다. 연결을 끊고 새로 만들어 주세요.', 409)
  const columns = mergeColumns(project, existing.columns)
  await writeHeader(admin, project, token, existing.sheet_id, existing.sheet_name, columns)
  const { data, error } = await admin.from('form_maker_personal_sheets').update({
    google_email: token.google_email || existing.google_email,
    sheet_url: String(workbook?.spreadsheetUrl || existing.sheet_url),
    sheet_title: String(workbook?.properties?.title || existing.sheet_title),
    columns,
    status: 'connected',
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('project_id', project.id).select('*').single()
  if (error) throw error
  return data as PersonalSheetRow
}

async function appendPersonalSheet(admin: any, project: ProjectRow, submission: any) {
  const personalSheet = await loadPersonalSheet(admin, project.id)
  if (!personalSheet) {
    await admin.from('form_maker_submissions').update({ personal_sheet_sync_status: 'not_connected', personal_sheet_sync_error: null }).eq('id', submission.id)
    return { status: 'not_connected' }
  }
  const token = await loadGoogleToken(admin, project.owner_id)
  if (!token) {
    const message = 'Google 권한을 다시 연결해 주세요.'
    await admin.from('form_maker_personal_sheets').update({ status: 'reauthorize', last_error: message, updated_at: new Date().toISOString() }).eq('project_id', project.id)
    await admin.from('form_maker_submissions').update({ personal_sheet_sync_status: 'reauthorize', personal_sheet_sync_error: message }).eq('id', submission.id)
    return { status: 'reauthorize', error: message }
  }
  const columns = mergeColumns(project, personalSheet.columns)
  try {
    if (JSON.stringify(columns) !== JSON.stringify(personalSheet.columns || [])) {
      await writeHeader(admin, project, token, personalSheet.sheet_id, personalSheet.sheet_name, columns)
    }
    const range = `${quotedSheetName(personalSheet.sheet_name)}!A:ZZ`
    const response = await googleRequest(
      admin,
      project.owner_id,
      token,
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(personalSheet.sheet_id)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ range, majorDimension: 'ROWS', values: [answerRow(columns, submission)] }),
      },
    )
    if (!response.ok) throw await googleError(response, '개인 Google 시트에 응답을 저장하지 못했습니다.')
    const now = new Date().toISOString()
    await admin.from('form_maker_personal_sheets').update({ columns, status: 'connected', last_error: null, last_synced_at: now, updated_at: now }).eq('project_id', project.id)
    await admin.from('form_maker_submissions').update({ personal_sheet_sync_status: 'synced', personal_sheet_sync_error: null }).eq('id', submission.id)
    return { status: 'synced' }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : '개인 시트 저장에 실패했습니다.'
    const status = error instanceof HttpError && [401, 403].includes(error.status) ? 'reauthorize' : 'failed'
    await admin.from('form_maker_personal_sheets').update({ status: status === 'reauthorize' ? 'reauthorize' : 'error', last_error: message, updated_at: new Date().toISOString() }).eq('project_id', project.id)
    await admin.from('form_maker_submissions').update({ personal_sheet_sync_status: status, personal_sheet_sync_error: message }).eq('id', submission.id)
    return { status, error: message }
  }
}

async function sendToHiddenBackup(project: ProjectRow, submission: any) {
  const answers = submission.answers && typeof submission.answers === 'object' ? submission.answers : {}
  const payload: Record<string, unknown> = {
    _ts: new Date(submission.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    _submissionId: submission.id,
    _formTitle: project.title || '제목 없는 폼',
    'DB 판정': qualityLabel(submission),
    '판정 사유': Array.isArray(submission.quality_reasons) ? submission.quality_reasons.join(' · ') : '',
  }
  for (const field of projectFields(project)) {
    const value = answers[field.id]
    payload[String(field.label || '질문')] = Array.isArray(value) ? value.join(', ') : value ?? ''
  }
  const response = await fetch(BACKUP_SCRIPT_URL, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new HttpError(`전체 백업 오류 (${response.status})`, 502)
}

async function authUser(supabaseUrl: string, anonKey: string, authorization: string) {
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) return null
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  // This client has no persisted browser session. Passing the JWT only as a
  // global fetch header leaves auth.getUser() with no session to inspect and
  // made every authenticated owner look anonymous inside the Edge Function.
  const { data: { user }, error } = await client.auth.getUser(accessToken)
  if (error) return null
  return user || null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'POST 요청만 사용할 수 있습니다.' }, 405)

  const authorization = request.headers.get('authorization') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  if (!anonKey || !serviceKey || !supabaseUrl) return json({ error: '서버 설정이 완료되지 않았습니다.' }, 500)

  let submissionId = ''
  try {
    const body = await request.json()
    const action = ['status', 'connect', 'disconnect'].includes(body?.action) ? body.action : 'sync'
    const projectId = String(body?.projectId || '')
    submissionId = String(body?.submissionId || '')
    const syncKey = String(body?.syncKey || '')
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuid.test(projectId) || (action === 'sync' && !uuid.test(submissionId))) throw new HttpError('잘못된 요청입니다.', 400)

    const user = await authUser(supabaseUrl, anonKey, authorization)
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: project, error: projectError } = await admin.from('form_maker_projects').select('id,owner_id,title,status,pages').eq('id', projectId).single()
    if (projectError || !project) throw new HttpError('폼을 찾을 수 없습니다.', 404)

    if (action !== 'sync') {
      if (!user || project.owner_id !== user.id) throw new HttpError('폼 소유자만 시트를 설정할 수 있습니다.', 403)
      if (action === 'status') {
        const personalSheet = await loadPersonalSheet(admin, project.id)
        return json({ ok: true, personalSheet: publicPersonalSheet(personalSheet), automaticRefreshReady: Boolean(GOOGLE_CLIENT_SECRET) })
      }
      if (action === 'disconnect') {
        const { error } = await admin.from('form_maker_personal_sheets').delete().eq('project_id', project.id).eq('owner_id', user.id)
        if (error) throw error
        return json({ ok: true, personalSheet: null, preserved: true })
      }

      const providerToken = String(body?.providerToken || '').trim()
      const providerRefreshToken = String(body?.providerRefreshToken || '').trim()
      if (providerToken) {
        const inspected = await inspectProviderToken(providerToken, user.email || '')
        await storeGoogleToken(admin, user.id, {
          access_token: providerToken,
          refresh_token: providerRefreshToken || null,
          google_email: inspected.googleEmail || user.email || '',
          granted_scope: inspected.scope,
        })
      }
      const token = await loadGoogleToken(admin, user.id)
      if (!token) throw new HttpError('Google 시트 권한 승인이 필요합니다.', 401)
      const personalSheet = await ensurePersonalSheet(admin, project, token)
      return json({ ok: true, personalSheet: publicPersonalSheet(personalSheet), automaticRefreshReady: Boolean(GOOGLE_CLIENT_SECRET) })
    }

    const { data: submission, error: submissionError } = await admin
      .from('form_maker_submissions')
      .select('id,project_id,answers,sync_key,sheet_sync_status,sheet_sync_error,personal_sheet_sync_status,personal_sheet_sync_error,quality_status,quality_reasons,submitted_at')
      .eq('id', submissionId)
      .eq('project_id', projectId)
      .single()
    if (submissionError || !submission) throw new HttpError('응답을 찾을 수 없습니다.', 404)
    const ownerRequest = Boolean(user) && project.owner_id === user?.id
    const publicSubmissionRequest = project.status === 'published' && uuid.test(syncKey) && submission.sync_key === syncKey
    if (!ownerRequest && !publicSubmissionRequest) throw new HttpError('요청 권한이 없습니다.', 403)

    let hiddenBackupError = ''
    if (submission.sheet_sync_status !== 'synced') {
      try {
        await sendToHiddenBackup(project as ProjectRow, submission)
        await admin.from('form_maker_submissions').update({ sheet_sync_status: 'synced', sheet_sync_error: null }).eq('id', submission.id)
      } catch (error) {
        hiddenBackupError = error instanceof Error ? error.message.slice(0, 1000) : '전체 백업에 실패했습니다.'
        await admin.from('form_maker_submissions').update({ sheet_sync_status: 'failed', sheet_sync_error: hiddenBackupError }).eq('id', submission.id)
      }
    }

    const personalResult = submission.personal_sheet_sync_status === 'synced'
      ? { status: 'synced' }
      : await appendPersonalSheet(admin, project as ProjectRow, submission)

    if (hiddenBackupError) return json({ error: hiddenBackupError, personalStatus: personalResult.status }, 502)
    return json({ ok: true, status: 'synced', personalStatus: personalResult.status, personalError: 'error' in personalResult ? personalResult.error : '' })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    console.error(error)
    return json({ error: message }, status)
  }
})
