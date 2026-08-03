import { createClient } from 'npm:@supabase/supabase-js@2.112.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
  })
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
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { authorization } },
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { formId, responseId } = await request.json()
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuid.test(String(formId)) || !uuid.test(String(responseId))) return json({ error: 'Invalid request.' }, 400)

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const [{ data: form, error: formError }, { data: response, error: responseError }] = await Promise.all([
      admin.from('form_builder_forms').select('id,user_id,questions,sheet_id,sheet_name').eq('id', formId).single(),
      admin.from('form_builder_responses').select('id,form_id,answers,sheet_sync_status,submitted_at').eq('id', responseId).eq('form_id', formId).single(),
    ])
    if (formError || responseError || !form || !response) return json({ error: 'Form or response not found.' }, 404)
    if (form.user_id !== user.id) return json({ error: 'Forbidden' }, 403)
    if (!form.sheet_id) {
      await admin.from('form_builder_responses').update({ sheet_sync_status: 'not_connected', sheet_sync_error: null }).eq('id', response.id)
      return json({ ok: true, status: 'not_connected' })
    }
    if (response.sheet_sync_status === 'synced') return json({ ok: true, status: 'synced' })

    const { data: tokenRow } = await admin.from('google_tokens').select('access_token').eq('user_id', form.user_id).maybeSingle()
    if (!tokenRow?.access_token) {
      await admin.from('form_builder_responses').update({ sheet_sync_status: 'failed', sheet_sync_error: 'Google Sheets 권한이 없습니다. 폼 소유자가 다시 로그인해야 합니다.' }).eq('id', response.id)
      return json({ error: 'Google Sheets permission is missing.' }, 409)
    }

    const questions = Array.isArray(form.questions) ? form.questions.filter((question: any) => question.type !== 'notice') : []
    const answers = response.answers && typeof response.answers === 'object' ? response.answers : {}
    const values = [
      new Date(response.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      ...questions.map((question: any) => {
        const value = answers[question.id]
        return Array.isArray(value) ? value.join(', ') : value ?? ''
      }),
    ]
    const sheetName = form.sheet_name || '응답'
    const range = encodeURIComponent(`${sheetName}!A:ZZ`)
    const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(form.sheet_id)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenRow.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ range: `${sheetName}!A:ZZ`, majorDimension: 'ROWS', values: [values] }),
    })

    if (!sheetResponse.ok) {
      const googleError = await sheetResponse.text()
      const message = sheetResponse.status === 401
        ? 'Google Sheets 권한이 만료되었습니다. 폼 소유자가 다시 로그인해야 합니다.'
        : `Google Sheets 오류 (${sheetResponse.status})`
      await admin.from('form_builder_responses').update({ sheet_sync_status: 'failed', sheet_sync_error: `${message}: ${googleError}`.slice(0, 1000) }).eq('id', response.id)
      return json({ error: message }, 502)
    }

    await admin.from('form_builder_responses').update({ sheet_sync_status: 'synced', sheet_sync_error: null }).eq('id', response.id)
    return json({ ok: true, status: 'synced' })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})
