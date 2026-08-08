import { supabase } from './supabase'

const ADMIN_TOKEN_KEY = 'form-maker-response-admin-token'

export function getResponseAdminToken() {
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function clearResponseAdminToken() {
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}

async function errorMessage(error) {
  try {
    const payload = await error?.context?.json()
    if (payload?.error) return payload.error
  } catch { /* the function response may already be consumed */ }
  return error?.message || '관리자 요청을 처리하지 못했습니다.'
}

export async function responseAdminRequest(action, payload = {}) {
  const token = getResponseAdminToken()
  const { data, error } = await supabase.functions.invoke('form-maker-admin', {
    body: { action, token, ...payload },
  })
  if (error) throw new Error(await errorMessage(error))
  if (data?.error) throw new Error(data.error)
  if (data?.token) window.sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token)
  return data || {}
}

export async function lockResponseAdmin() {
  try { await responseAdminRequest('lock') } finally { clearResponseAdminToken() }
}

export async function listResponseAdminSubmissions(projectId = '') {
  const submissions = []
  const pageSize = 1000
  const maximum = 20000
  for (let offset = 0; offset < maximum; offset += pageSize) {
    const page = await responseAdminRequest('submissions', { projectId, offset, limit: pageSize })
    submissions.push(...(page.submissions || []))
    if (!page.hasMore) break
  }
  return submissions
}
