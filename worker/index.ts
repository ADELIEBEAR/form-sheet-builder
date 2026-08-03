import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { appendResponse, createSpreadsheet, inspectSpreadsheet, writeHeader } from './sheets'
import { clearSessionCookie, enforceRateLimit, encryptToken, readCookie, requireUser, sessionCookie } from './security'
import { normalizeSlug, serializeForm, serializeResponse, validateAnswers, validateFormInput, ValidationError } from './forms'
import type { AppVariables, Env, FormRow, ResponseRow, UserRow } from './types'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

app.use('/api/*', cors({ origin: (origin, c) => origin === c.env.APP_URL ? origin : c.env.APP_URL, credentials: true }))

app.onError((error, c) => {
  console.error(error)
  const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
  return c.json({ error: message }, error instanceof ValidationError ? 400 : 500)
})

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/oauth/google/start', async (c) => {
  const returnToInput = c.req.query('return_to') || '/dashboard'
  const returnTo = returnToInput.startsWith('/') && !returnToInput.startsWith('//') ? returnToInput : '/dashboard'
  const state = crypto.randomUUID()
  await c.env.DB.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').bind(Date.now()).run()
  await c.env.DB.prepare('INSERT INTO oauth_states (state, return_to, expires_at) VALUES (?, ?, ?)').bind(state, returnTo, Date.now() + 10 * 60 * 1000).run()
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${c.env.APP_URL}/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  })
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

app.get('/oauth/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) return c.redirect('/?auth_error=missing_callback')
  const stored = await c.env.DB.prepare('SELECT return_to FROM oauth_states WHERE state = ? AND expires_at > ?').bind(state, Date.now()).first<{ return_to: string }>()
  if (!stored) return c.redirect('/?auth_error=invalid_state')
  await c.env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run()

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.env.GOOGLE_CLIENT_ID, client_secret: c.env.GOOGLE_CLIENT_SECRET, redirect_uri: `${c.env.APP_URL}/oauth/google/callback`, grant_type: 'authorization_code' }),
  })
  const tokens = await tokenResponse.json<any>()
  if (!tokenResponse.ok || !tokens.access_token) return c.redirect('/?auth_error=token_exchange')

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } })
  const profile = await profileResponse.json<any>()
  if (!profileResponse.ok || !profile.sub || !profile.email) return c.redirect('/?auth_error=profile')
  const allowlist = (c.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
  if (allowlist.length && !allowlist.includes(String(profile.email).toLowerCase())) return c.redirect('/?auth_error=not_allowed')

  const accessToken = await encryptToken(tokens.access_token, c.env.TOKEN_ENCRYPTION_KEY)
  const refreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token, c.env.TOKEN_ENCRYPTION_KEY) : null
  const expiresAt = Date.now() + Number(tokens.expires_in || 3600) * 1000
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, name, avatar_url, google_access_token, google_refresh_token, token_expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      google_access_token = excluded.google_access_token,
      google_refresh_token = COALESCE(excluded.google_refresh_token, users.google_refresh_token),
      token_expires_at = excluded.token_expires_at,
      updated_at = datetime('now')
  `).bind(profile.sub, profile.email, profile.name || profile.email, profile.picture || null, accessToken, refreshToken, expiresAt).run()

  const sessionId = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, profile.sub, Date.now() + 30 * 24 * 60 * 60 * 1000).run()
  c.header('Set-Cookie', sessionCookie(sessionId, c.env.APP_URL))
  return c.redirect(stored.return_to)
})

app.post('/api/auth/logout', async (c) => {
  const sessionId = readCookie(c.req.raw, 'form_session')
  if (sessionId) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  c.header('Set-Cookie', clearSessionCookie(c.env.APP_URL))
  return c.body(null, 204)
})

app.get('/api/me', requireUser, (c) => {
  const user = c.get('user')
  return c.json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url } })
})

app.get('/api/forms', requireUser, async (c) => {
  const user = c.get('user')
  const result = await c.env.DB.prepare(`
    SELECT f.*, COUNT(r.id) AS response_count
    FROM forms f LEFT JOIN responses r ON r.form_id = f.id
    WHERE f.user_id = ?
    GROUP BY f.id ORDER BY f.updated_at DESC
  `).bind(user.id).all<FormRow>()
  return c.json({ forms: result.results.map(serializeForm) })
})

app.post('/api/forms', requireUser, async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({})) as any
  const input = validateFormInput(body)
  let slug = normalizeSlug(body.slug, input.title)
  const existing = await c.env.DB.prepare('SELECT id FROM forms WHERE slug = ?').bind(slug).first()
  if (existing) slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`INSERT INTO forms (id, user_id, title, description, slug, questions_json, theme_json, success_message, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, user.id, input.title, input.description, slug, JSON.stringify(input.questions), JSON.stringify(input.theme), input.successMessage, input.isPublished ? 1 : 0).run()
  const row = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRow>()
  return c.json({ form: serializeForm(row!) }, 201)
})

app.get('/api/forms/:id', requireUser, async (c) => {
  const row = await ownedForm(c.env, c.req.param('id')!, c.get('user').id)
  if (!row) return c.json({ error: '폼을 찾을 수 없습니다.' }, 404)
  return c.json({ form: serializeForm(row) })
})

app.put('/api/forms/:id', requireUser, async (c) => {
  const user = c.get('user')
  const current = await ownedForm(c.env, c.req.param('id')!, user.id)
  if (!current) return c.json({ error: '폼을 찾을 수 없습니다.' }, 404)
  const body = await c.req.json<any>()
  const input = validateFormInput(body)
  const slug = normalizeSlug(body.slug, input.title)
  const duplicate = await c.env.DB.prepare('SELECT id FROM forms WHERE slug = ? AND id <> ?').bind(slug, current.id).first()
  if (duplicate) return c.json({ error: '이미 사용 중인 공개 주소입니다.' }, 409)
  await c.env.DB.prepare(`UPDATE forms SET title = ?, description = ?, slug = ?, questions_json = ?, theme_json = ?, success_message = ?, is_published = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(input.title, input.description, slug, JSON.stringify(input.questions), JSON.stringify(input.theme), input.successMessage, input.isPublished ? 1 : 0, current.id).run()
  const row = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(current.id).first<FormRow>()
  if (row?.sheet_id) await writeHeader(c.env, user, row)
  return c.json({ form: serializeForm(row!) })
})

app.delete('/api/forms/:id', requireUser, async (c) => {
  const user = c.get('user')
  const current = await ownedForm(c.env, c.req.param('id')!, user.id)
  if (!current) return c.json({ error: '폼을 찾을 수 없습니다.' }, 404)
  await c.env.DB.prepare('DELETE FROM forms WHERE id = ?').bind(current.id).run()
  return c.body(null, 204)
})

app.post('/api/forms/:id/duplicate', requireUser, async (c) => {
  const user = c.get('user')
  const current = await ownedForm(c.env, c.req.param('id')!, user.id)
  if (!current) return c.json({ error: '폼을 찾을 수 없습니다.' }, 404)
  const id = crypto.randomUUID()
  const slug = `${current.slug}-copy-${id.slice(0, 5)}`
  await c.env.DB.prepare(`INSERT INTO forms (id, user_id, title, description, slug, questions_json, theme_json, success_message, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`)
    .bind(id, user.id, `${current.title} 복사본`, current.description, slug, current.questions_json, current.theme_json, current.success_message).run()
  const row = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRow>()
  return c.json({ form: serializeForm(row!) }, 201)
})

app.post('/api/forms/:id/sheet', requireUser, async (c) => {
  const user = c.get('user')
  const form = await ownedForm(c.env, c.req.param('id')!, user.id)
  if (!form) return c.json({ error: '폼을 찾을 수 없습니다.' }, 404)
  const body = await c.req.json<{ action?: string; sheetId?: string }>()
  if (!['create', 'link'].includes(body.action || '')) return c.json({ error: '올바르지 않은 시트 연결 방식입니다.' }, 400)
  const rawSheetId = String(body.sheetId || '').trim()
  const sheetId = rawSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || rawSheetId
  if (body.action === 'link' && !/^[a-zA-Z0-9-_]{20,}$/.test(sheetId)) return c.json({ error: 'Google Sheet 주소 또는 ID를 확인해주세요.' }, 400)
  const sheet = body.action === 'create'
    ? await createSpreadsheet(c.env, user, form.title)
    : await inspectSpreadsheet(c.env, user, sheetId)
  await c.env.DB.prepare('UPDATE forms SET sheet_id = ?, sheet_url = ?, sheet_name = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(sheet.id, sheet.url, sheet.sheetName, form.id).run()
  const updated = await c.env.DB.prepare('SELECT * FROM forms WHERE id = ?').bind(form.id).first<FormRow>()
  await writeHeader(c.env, user, updated!)
  return c.json({ form: serializeForm(updated!) })
})

app.get('/api/forms/:id/responses', requireUser, async (c) => {
  const form = await ownedForm(c.env, c.req.param('id')!, c.get('user').id)
  if (!form) return c.json({ error: '폼을 찾을 수 없습니다.' }, 404)
  const result = await c.env.DB.prepare('SELECT * FROM responses WHERE form_id = ? ORDER BY submitted_at DESC LIMIT 5000').bind(form.id).all<ResponseRow>()
  return c.json({ responses: result.results.map(serializeResponse) })
})

app.post('/api/forms/:id/responses/:responseId/retry', requireUser, async (c) => {
  const user = c.get('user')
  const form = await ownedForm(c.env, c.req.param('id')!, user.id)
  if (!form?.sheet_id) return c.json({ error: 'Google Sheet가 연결되지 않았습니다.' }, 400)
  const response = await c.env.DB.prepare('SELECT * FROM responses WHERE id = ? AND form_id = ?').bind(c.req.param('responseId'), form.id).first<ResponseRow>()
  if (!response) return c.json({ error: '응답을 찾을 수 없습니다.' }, 404)
  try {
    await appendResponse(c.env, user, form, response)
    await c.env.DB.prepare("UPDATE responses SET sheet_sync_status = 'synced', sheet_sync_error = NULL WHERE id = ?").bind(response.id).run()
  } catch (error) {
    await c.env.DB.prepare("UPDATE responses SET sheet_sync_status = 'failed', sheet_sync_error = ? WHERE id = ?").bind(error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error', response.id).run()
    throw error
  }
  const updated = await c.env.DB.prepare('SELECT * FROM responses WHERE id = ?').bind(response.id).first<ResponseRow>()
  return c.json({ response: serializeResponse(updated!) })
})

app.post('/api/uploads', requireUser, async (c) => {
  const user = c.get('user')
  const data = await c.req.formData()
  const file = data.get('file')
  if (!(file instanceof File)) return c.json({ error: '이미지 파일이 필요합니다.' }, 400)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return c.json({ error: 'JPG, PNG, WebP 이미지만 올릴 수 있습니다.' }, 400)
  if (file.size > 5 * 1024 * 1024) return c.json({ error: '이미지는 5MB 이하여야 합니다.' }, 413)
  const formId = typeof data.get('formId') === 'string' ? String(data.get('formId')) : null
  if (formId && !await ownedForm(c.env, formId, user.id)) return c.json({ error: '폼을 찾을 수 없습니다.' }, 404)
  const key = `${user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.webp`
  await c.env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } })
  await c.env.DB.prepare('INSERT INTO upload_objects (object_key, user_id, form_id, content_type, byte_size) VALUES (?, ?, ?, ?, ?)').bind(key, user.id, formId, file.type, file.size).run()
  return c.json({ url: `/media/${key}` }, 201)
})

app.get('/media/*', async (c) => {
  const key = c.req.path.replace(/^\/media\//, '')
  const object = await c.env.IMAGES.get(key)
  if (!object) return c.notFound()
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
})

app.get('/api/public/forms/:slug', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM forms WHERE slug = ? AND is_published = 1').bind(c.req.param('slug')).first<FormRow>()
  if (!row) return c.json({ error: '게시되지 않았거나 존재하지 않는 폼입니다.' }, 404)
  return c.json({ form: serializeForm(row) })
})

app.post('/api/public/forms/:slug/responses', async (c) => {
  const form = await c.env.DB.prepare('SELECT * FROM forms WHERE slug = ? AND is_published = 1').bind(c.req.param('slug')).first<FormRow>()
  if (!form) return c.json({ error: '게시되지 않았거나 존재하지 않는 폼입니다.' }, 404)
  if (!await enforceRateLimit(c.env, c.req.raw, `submit:${form.id}`)) return c.json({ error: '잠시 후 다시 제출해주세요.' }, 429)
  const body = await c.req.json<any>()
  if (body.website) return c.json({ ok: true })
  if (Number(body.startedAt) && Date.now() - Number(body.startedAt) < 1200) return c.json({ error: '너무 빠르게 제출되었습니다. 다시 확인해주세요.' }, 400)
  const questions = JSON.parse(form.questions_json)
  const answers = validateAnswers(questions, body.answers)
  const id = crypto.randomUUID()
  const status = form.sheet_id ? 'pending' : 'not_connected'
  await c.env.DB.prepare('INSERT INTO responses (id, form_id, answers_json, sheet_sync_status) VALUES (?, ?, ?, ?)').bind(id, form.id, JSON.stringify(answers), status).run()
  const response = await c.env.DB.prepare('SELECT * FROM responses WHERE id = ?').bind(id).first<ResponseRow>()
  if (form.sheet_id && response) {
    try {
      const owner = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(form.user_id).first<UserRow>()
      if (!owner) throw new Error('폼 소유자를 찾을 수 없습니다.')
      await appendResponse(c.env, owner, form, response)
      await c.env.DB.prepare("UPDATE responses SET sheet_sync_status = 'synced' WHERE id = ?").bind(id).run()
    } catch (error) {
      await c.env.DB.prepare("UPDATE responses SET sheet_sync_status = 'failed', sheet_sync_error = ? WHERE id = ?").bind(error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error', id).run()
    }
  }
  return c.json({ ok: true, id }, 201)
})

async function ownedForm(env: Env, id: string, userId: string) {
  return env.DB.prepare('SELECT * FROM forms WHERE id = ? AND user_id = ?').bind(id, userId).first<FormRow>()
}

export default app
