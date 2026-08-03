import { decryptToken, encryptToken } from './security'
import { parseJson } from './forms'
import type { Env, FormRow, Question, ResponseRow, UserRow } from './types'

async function googleRequest(url: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${token}`)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const response = await fetch(url, { ...init, headers })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google API 오류 (${response.status}): ${body.slice(0, 300)}`)
  }
  return response.status === 204 ? null : response.json()
}

export async function validAccessToken(env: Env, user: UserRow) {
  if (user.google_access_token && user.token_expires_at && user.token_expires_at > Date.now() + 60000) return decryptToken(user.google_access_token, env.TOKEN_ENCRYPTION_KEY)
  if (!user.google_refresh_token) throw new Error('Google 권한이 만료되었습니다. 다시 로그인해주세요.')
  const refreshToken = await decryptToken(user.google_refresh_token, env.TOKEN_ENCRYPTION_KEY)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const tokens = await response.json<any>()
  if (!response.ok || !tokens.access_token) throw new Error('Google 로그인 갱신에 실패했습니다. 다시 로그인해주세요.')
  const encryptedAccess = await encryptToken(tokens.access_token, env.TOKEN_ENCRYPTION_KEY)
  const expiresAt = Date.now() + Number(tokens.expires_in || 3600) * 1000
  await env.DB.prepare('UPDATE users SET google_access_token = ?, token_expires_at = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(encryptedAccess, expiresAt, user.id).run()
  return tokens.access_token as string
}

export async function createSpreadsheet(env: Env, user: UserRow, title: string) {
  const token = await validAccessToken(env, user)
  const data = await googleRequest('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify({ properties: { title: `${title} 응답` }, sheets: [{ properties: { title: '응답' } }] }),
  }) as any
  return { id: data.spreadsheetId as string, url: data.spreadsheetUrl as string, sheetName: data.sheets?.[0]?.properties?.title || '응답' }
}

export async function inspectSpreadsheet(env: Env, user: UserRow, spreadsheetId: string) {
  const token = await validAccessToken(env, user)
  const data = await googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,sheets.properties.title`, token) as any
  const sheetName = data.sheets?.[0]?.properties?.title
  if (!sheetName) throw new Error('사용할 수 있는 시트 탭이 없습니다.')
  return { id: data.spreadsheetId as string, url: data.spreadsheetUrl as string, sheetName: sheetName as string }
}

function quoteSheetName(name: string) {
  return `'${name.replaceAll("'", "''")}'`
}

export async function writeHeader(env: Env, user: UserRow, form: FormRow) {
  if (!form.sheet_id) return
  const token = await validAccessToken(env, user)
  const questions = parseJson<Question[]>(form.questions_json, []).filter((question) => question.type !== 'notice')
  const values = [['제출 시각', ...questions.map((question) => question.label)]]
  const range = `${quoteSheetName(form.sheet_name)}!A1`
  await googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(form.sheet_id)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, token, { method: 'PUT', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) })
}

export async function appendResponse(env: Env, user: UserRow, form: FormRow, response: ResponseRow) {
  if (!form.sheet_id) return
  const token = await validAccessToken(env, user)
  const questions = parseJson<Question[]>(form.questions_json, []).filter((question) => question.type !== 'notice')
  const answers = parseJson<Record<string, string | string[]>>(response.answers_json, {})
  const values = [[response.submitted_at, ...questions.map((question) => {
    const value = answers[question.id]
    return Array.isArray(value) ? value.join(', ') : value || ''
  })]]
  const range = `${quoteSheetName(form.sheet_name)}!A:ZZ`
  await googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(form.sheet_id)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, token, { method: 'POST', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) })
}
