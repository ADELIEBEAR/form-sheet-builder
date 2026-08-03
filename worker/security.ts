import type { Context } from 'hono'
import type { AppVariables, Env, UserRow } from './types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function encryptionKey(encodedKey: string) {
  const bytes = base64ToBytes(encodedKey)
  if (bytes.byteLength !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes')
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptToken(value: string, encodedKey: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(encodedKey), encoder.encode(value))
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`
}

export async function decryptToken(value: string, encodedKey: string) {
  const [ivValue, cipherValue] = value.split('.')
  if (!ivValue || !cipherValue) throw new Error('Invalid encrypted token')
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(ivValue) }, await encryptionKey(encodedKey), base64ToBytes(cipherValue))
  return decoder.decode(plain)
}

export function readCookie(request: Request, name: string) {
  const cookies = request.headers.get('cookie') || ''
  for (const part of cookies.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function sessionCookie(sessionId: string, appUrl: string, maxAge = 60 * 60 * 24 * 30) {
  const secure = appUrl.startsWith('https://') ? '; Secure' : ''
  return `form_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

export function clearSessionCookie(appUrl: string) {
  return sessionCookie('', appUrl, 0)
}

export async function requireUser(c: Context<{ Bindings: Env; Variables: AppVariables }>, next: () => Promise<void>) {
  const sessionId = readCookie(c.req.raw, 'form_session')
  if (!sessionId) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const user = await c.env.DB.prepare(`
    SELECT u.* FROM users u
    JOIN sessions s ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `).bind(sessionId, Date.now()).first<UserRow>()
  if (!user) return c.json({ error: '로그인 세션이 만료되었습니다.' }, 401)
  c.set('user', user)
  await next()
}

export async function hashRateKey(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function enforceRateLimit(env: Env, request: Request, scope: string) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local'
  const key = await hashRateKey(`${scope}:${ip}`, env.SESSION_SECRET)
  const windowStart = Math.floor(Date.now() / 600000) * 600000
  await env.DB.prepare(`
    INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1
  `).bind(key, windowStart).run()
  const result = await env.DB.prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?').bind(key, windowStart).first<{ count: number }>()
  return (result?.count || 0) <= 60
}
