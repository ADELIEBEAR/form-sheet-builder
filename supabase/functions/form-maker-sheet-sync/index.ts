import { createClient } from 'npm:@supabase/supabase-js@2.112.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' } })
}

type GoogleTokenRow = { access_token: string; refresh_token?: string | null }

async function refreshGoogleAccessToken(admin: any, userId: string, refreshToken?: string | null) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
  if (!refreshToken || !clientId || !clientSecret) return ''

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const tokenData = await tokenResponse.json().catch(() => ({}))
  if (!tokenResponse.ok || typeof tokenData?.access_token !== 'string') return ''

  await admin.from('form_maker_google_tokens').update({ access_token: tokenData.access_token, updated_at: new Date().toISOString() }).eq('user_id', userId)
  return tokenData.access_token
}

async function googleRequest(admin: any, userId: string, tokenRow: GoogleTokenRow, url: string, init: RequestInit) {
  const request = (accessToken: string) => fetch(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${accessToken}` },
  })
  const firstResponse = await request(tokenRow.access_token)
  if (firstResponse.status !== 401) return firstResponse

  const refreshedToken = await refreshGoogleAccessToken(admin, userId, tokenRow.refresh_token)
  return refreshedToken ? request(refreshedToken) : firstResponse
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('authorization') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  if (!anonKey || !serviceKey || !supabaseUrl) return json({ error: 'Server configuration is incomplete.' }, 500)

  try {
    const { projectId, submissionId, syncKey } = await request.json()
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuid.test(String(projectId)) || !uuid.test(String(submissionId))) return json({ error: 'Invalid request.' }, 400)

    let userId = ''
    if (authorization) {
      const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { authorization } } })
      const { data: { user } } = await authClient.auth.getUser()
      userId = user?.id || ''
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const [{ data: project, error: projectError }, { data: submission, error: submissionError }] = await Promise.all([
      admin.from('form_maker_projects').select('id,owner_id,status,pages,sheet_id,sheet_name').eq('id', projectId).single(),
      admin.from('form_maker_submissions').select('id,project_id,answers,sync_key,sheet_sync_status,quality_status,quality_reasons,submitted_at').eq('id', submissionId).eq('project_id', projectId).single(),
    ])
    if (projectError || submissionError || !project || !submission) return json({ error: 'Project or submission not found.' }, 404)
    const ownerRequest = Boolean(userId) && project.owner_id === userId
    const publicSubmissionRequest = project.status === 'published' && uuid.test(String(syncKey)) && submission.sync_key === syncKey
    if (!ownerRequest && !publicSubmissionRequest) return json({ error: 'Forbidden' }, 403)
    if (!project.sheet_id) {
      await admin.from('form_maker_submissions').update({ sheet_sync_status: 'not_connected', sheet_sync_error: null }).eq('id', submission.id)
      return json({ ok: true, status: 'not_connected' })
    }
    if (submission.sheet_sync_status === 'synced') return json({ ok: true, status: 'synced' })

    const { data: tokenRow } = await admin.from('form_maker_google_tokens').select('access_token,refresh_token').eq('user_id', project.owner_id).maybeSingle()
    if (!tokenRow?.access_token) {
      await admin.from('form_maker_submissions').update({ sheet_sync_status: 'failed', sheet_sync_error: 'Google Sheets 권한이 없습니다. 폼 소유자가 다시 로그인해야 합니다.' }).eq('id', submission.id)
      return json({ error: 'Google Sheets permission is missing.' }, 409)
    }

    const fields = Array.isArray(project.pages)
      ? project.pages.flatMap((page: any) => Array.isArray(page.fields) ? page.fields : []).filter((field: any) => field.type !== 'heading')
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
    const sheetName = project.sheet_name || '응답'
    const range = encodeURIComponent(`${sheetName}!A:ZZ`)
    const sheetResponse = await googleRequest(admin, project.owner_id, tokenRow, `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(project.sheet_id)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ range: `${sheetName}!A:ZZ`, majorDimension: 'ROWS', values: [values] }),
    })

    if (!sheetResponse.ok) {
      const googleError = await sheetResponse.text()
      const message = sheetResponse.status === 401 ? 'Google Sheets 권한 갱신이 필요합니다. 폼 설정에서 Google 권한을 다시 연결해 주세요.' : `Google Sheets 오류 (${sheetResponse.status})`
      await admin.from('form_maker_submissions').update({ sheet_sync_status: 'failed', sheet_sync_error: `${message}: ${googleError}`.slice(0, 1000) }).eq('id', submission.id)
      return json({ error: message }, 502)
    }

    await admin.from('form_maker_submissions').update({ sheet_sync_status: 'synced', sheet_sync_error: null }).eq('id', submission.id)
    return json({ ok: true, status: 'synced' })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})
