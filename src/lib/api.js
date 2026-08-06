import { ASSET_BUCKET, supabase } from './supabase'
import { listResponseAdminSubmissions, lockResponseAdmin, responseAdminRequest } from './admin'
import { normalizeConsentFields, normalizeMemoColor } from './maker'
import { sanitizeSite } from './siteMaker'
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

function serializeProject(row, meta = null) {
  const countRelation = row.form_maker_submissions
  const responseCount = Array.isArray(countRelation) ? Number(countRelation[0]?.count || 0) : Number(row.response_count || 0)
  const settings = row.settings || {}
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    pages: normalizeConsentFields(row.pages, settings.consentLabel || '내용을 확인했으며 동의합니다.'),
    theme: row.theme || {},
    settings,
    status: row.status || 'draft',
    sheetId: row.sheet_id || '',
    sheetUrl: row.sheet_url || '',
    sheetName: row.sheet_name || '응답',
    responseCount,
    folder: meta?.folder || '',
    memo: meta?.memo || '',
    memoColor: normalizeMemoColor(meta?.memo_color || meta?.memoColor),
    responseLockEnabled: Boolean(meta?.response_lock_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function serializeSite(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    formProjectId: row.form_project_id || '',
    title: row.title,
    slug: row.slug,
    content: row.content || {},
    theme: row.theme || {},
    settings: row.settings || {},
    status: row.status || 'draft',
    publishedAt: row.published_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function cleanProjectMeta(input) {
  return {
    folder: String(input?.folder || '').trim().slice(0, 80),
    memo: String(input?.memo || '').slice(0, 2000),
    memoColor: normalizeMemoColor(input?.memoColor || input?.memo_color),
  }
}

async function projectMetaMap(projectIds) {
  if (!projectIds.length) return new Map()
  const { data, error } = await supabase
    .from('form_maker_project_meta')
    .select('project_id,folder,memo,memo_color,response_lock_enabled')
    .in('project_id', projectIds)
  if (error) fail(error)
  return new Map((data || []).map((item) => [item.project_id, item]))
}

async function saveProjectMeta(projectId, input) {
  const meta = cleanProjectMeta(input)
  const { error } = await supabase.rpc('set_form_maker_project_meta_v2', {
    target_project_id: projectId,
    new_folder: meta.folder,
    new_memo: meta.memo,
    new_memo_color: meta.memoColor,
  })
  if (error) fail(error, '폴더와 메모를 저장하지 못했습니다.')
  return meta
}

function serializeSubmission(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    answers: row.answers || {},
    sheetSyncStatus: row.sheet_sync_status || 'not_connected',
    sheetSyncError: row.sheet_sync_error || '',
    qualityStatus: row.quality_status || 'normal',
    qualityReasons: Array.isArray(row.quality_reasons) ? row.quality_reasons : [],
    qualitySource: row.quality_source || 'auto',
    duplicateOf: row.duplicate_of || '',
    qualityReviewedAt: row.quality_reviewed_at || '',
    submittedAt: row.submitted_at,
  }
}

async function listSubmissions(projectId = '') {
  const rows = await listResponseAdminSubmissions(projectId)
  return rows.map(serializeSubmission)
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new ApiError('로그인이 필요합니다.', 401, error)
  return data.user
}

async function ownedProject(id) {
  const user = await requireUser()
  const { data, error } = await supabase.from('form_maker_projects').select('*').eq('id', id).eq('owner_id', user.id).single()
  if (error || !data) throw new ApiError('폼을 찾을 수 없습니다.', error?.code === 'PGRST116' ? 404 : 500, error)
  return data
}

async function ownedSite(id) {
  const user = await requireUser()
  const { data, error } = await supabase.from('form_maker_sites').select('*').eq('id', id).eq('owner_id', user.id).single()
  if (error || !data) throw new ApiError('홍보 사이트를 찾을 수 없습니다.', error?.code === 'PGRST116' ? 404 : 500, error)
  return data
}

async function verifyLinkedProject(projectId, userId) {
  if (!projectId) return null
  const { data, error } = await supabase.from('form_maker_projects').select('id,status,title').eq('id', projectId).eq('owner_id', userId).single()
  if (error || !data) throw new ApiError('연결할 폼을 찾을 수 없습니다.', 400, error)
  return data
}

async function edgeFunctionError(error, fallback) {
  let message = error?.message || fallback
  const status = Number(error?.context?.status || 500)
  try {
    const payload = await error?.context?.json()
    if (payload?.error) message = payload.error
  } catch { /* the Edge Function response may already be consumed */ }
  return new ApiError(message, status, error)
}

async function ensureBackupSheet(projectId) {
  await ownedProject(projectId)
  const providerToken = window.localStorage.getItem('form_maker_google_provider_token') || ''
  const providerRefreshToken = window.localStorage.getItem('form_maker_google_provider_refresh_token') || ''
  const { data, error } = await supabase.functions.invoke('form-maker-sheet-sync', {
    body: { action: 'ensure', projectId, providerToken, providerRefreshToken },
  })
  if (error) throw await edgeFunctionError(error, '자동 백업시트를 준비하지 못했습니다.')
  if (!data?.ok || !data?.project) throw new ApiError(data?.error || '자동 백업시트를 준비하지 못했습니다.', 500, data)
  const meta = await projectMetaMap([projectId])
  return { project: serializeProject(data.project, meta.get(projectId)) }
}

function assetPath(url) {
  const marker = `/storage/v1/object/public/${ASSET_BUCKET}/`
  const index = String(url || '').indexOf(marker)
  return index < 0 ? '' : decodeURIComponent(String(url).slice(index + marker.length))
}

async function removeOwnedAssets(urls, ownerId) {
  const paths = [...new Set((urls || []).map(assetPath).filter((path) => path?.startsWith(`${ownerId}/`)))]
  if (!paths.length) return
  const { error } = await supabase.storage.from(ASSET_BUCKET).remove(paths)
  if (error) fail(error, '이미지 파일을 정리하지 못했습니다.')
}

async function deleteAsset(url) {
  const user = await requireUser()
  await removeOwnedAssets([url], user.id)
  return { ok: true }
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
  if (error) throw await edgeFunctionError(error, 'Google Sheets 동기화에 실패했습니다.')
  if (!data?.ok) throw new ApiError(data?.error || 'Google Sheets 동기화에 실패했습니다.', 500, data)
  return data
}

export async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const body = bodyOf(options)
  try {
    if (path === '/maker/projects' && method === 'GET') {
      const user = await requireUser()
      const { data, error } = await supabase.from('form_maker_projects').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false })
      if (error) fail(error)
      const meta = await projectMetaMap((data || []).map((project) => project.id))
      return { projects: (data || []).map((project) => serializeProject(project, meta.get(project.id))) }
    }

    if (path === '/maker/projects' && method === 'POST') {
      const user = await requireUser()
      const input = sanitizeProject(body)
      const { data, error } = await supabase.from('form_maker_projects').insert({ ...input, owner_id: user.id }).select().single()
      if (error?.code === '23505') throw new ApiError('이미 사용 중인 공개 주소입니다.', 409, error)
      if (error) fail(error)
      const meta = await saveProjectMeta(data.id, body)
      if (data.status === 'published') {
        const connected = await ensureBackupSheet(data.id).catch(() => null)
        if (connected?.project) return connected
      }
      return { project: serializeProject(data, meta) }
    }

    if (path === '/maker/sites' && method === 'GET') {
      const user = await requireUser()
      const { data, error } = await supabase.from('form_maker_sites').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false })
      if (error) fail(error, '홍보 사이트 목록을 불러오지 못했습니다.')
      return { sites: (data || []).map(serializeSite) }
    }

    if (path === '/maker/sites' && method === 'POST') {
      const user = await requireUser()
      const input = sanitizeSite(body)
      await verifyLinkedProject(input.form_project_id, user.id)
      const { data, error } = await supabase.from('form_maker_sites').insert({ ...input, owner_id: user.id }).select().single()
      if (error?.code === '23505') throw new ApiError('이미 사용 중인 사이트 주소입니다.', 409, error)
      if (error) fail(error, '홍보 사이트를 만들지 못했습니다.')
      return { site: serializeSite(data) }
    }

    if (path === '/maker/submissions' && method === 'GET') {
      await requireUser()
      return { submissions: await listSubmissions() }
    }

    if (path === '/maker/admin/status' && method === 'GET') {
      await requireUser()
      return responseAdminRequest('status')
    }

    if (path === '/maker/admin/setup' && method === 'POST') {
      await requireUser()
      return responseAdminRequest('setup', { pin: String(body?.pin || '') })
    }

    if (path === '/maker/admin/unlock' && method === 'POST') {
      await requireUser()
      return responseAdminRequest('unlock', { pin: String(body?.pin || '') })
    }

    if (path === '/maker/admin/lock' && method === 'POST') {
      await requireUser()
      await lockResponseAdmin()
      return { ok: true }
    }

    const publicSiteMatch = path.match(/^\/maker\/public-sites\/([^/]+)$/)
    if (publicSiteMatch && method === 'GET') {
      const { data, error } = await supabase.from('form_maker_sites').select('*').eq('slug', decodeURIComponent(publicSiteMatch[1])).eq('status', 'published').single()
      if (error || !data) throw new ApiError('공개되지 않았거나 존재하지 않는 사이트입니다.', 404, error)
      let project = null
      if (data.form_project_id) {
        const { data: projectRow } = await supabase.from('form_maker_projects').select('*').eq('id', data.form_project_id).eq('status', 'published').maybeSingle()
        if (projectRow) project = serializeProject(projectRow)
      }
      return { site: serializeSite(data), project }
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
      const { error } = await supabase.from('form_maker_submissions').insert({ id: submissionId, project_id: row.id, answers, sync_key: syncKey, sheet_sync_status: 'pending' })
      if (error) fail(error, '응답을 저장하지 못했습니다.')
      await invokeSheetSync(row.id, submissionId, syncKey).catch(() => {})
      return { ok: true, id: submissionId }
    }

    if (path === '/maker/assets' && method === 'POST') return uploadAsset(body)
    if (path === '/maker/assets' && method === 'DELETE') return deleteAsset(body?.url)

    const metaMatch = path.match(/^\/maker\/projects\/([^/]+)\/meta$/)
    if (metaMatch && method === 'PATCH') {
      await ownedProject(metaMatch[1])
      const meta = await saveProjectMeta(metaMatch[1], body)
      return { meta }
    }

    const submissionsMatch = path.match(/^\/maker\/projects\/([^/]+)\/submissions$/)
    if (submissionsMatch && method === 'GET') {
      await ownedProject(submissionsMatch[1])
      return { submissions: await listSubmissions(submissionsMatch[1]) }
    }

    const retryMatch = path.match(/^\/maker\/projects\/([^/]+)\/submissions\/([^/]+)\/sync$/)
    if (retryMatch && method === 'POST') {
      await ownedProject(retryMatch[1])
      const access = await responseAdminRequest('status')
      if (!access.unlocked) throw new ApiError('응답 관리자 로그인이 필요합니다.', 403)
      await invokeSheetSync(retryMatch[1], retryMatch[2])
      const submissions = await listSubmissions(retryMatch[1])
      const submission = submissions.find((item) => item.id === retryMatch[2])
      if (!submission) throw new ApiError('응답을 찾을 수 없습니다.', 404)
      return { submission }
    }

    const sheetMatch = path.match(/^\/maker\/projects\/([^/]+)\/sheet$/)
    if (sheetMatch && method === 'POST') return ensureBackupSheet(sheetMatch[1])

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
      const currentMeta = await projectMetaMap([current.id])
      const copiedMeta = currentMeta.get(current.id)
      const meta = await saveProjectMeta(data.id, { folder: copiedMeta?.folder || '', memo: copiedMeta?.memo || '', memoColor: copiedMeta?.memo_color || 'lemon' })
      return { project: serializeProject(data, meta) }
    }

    const siteMatch = path.match(/^\/maker\/sites\/([^/]+)$/)
    if (siteMatch && method === 'GET') {
      return { site: serializeSite(await ownedSite(siteMatch[1])) }
    }
    if (siteMatch && method === 'PUT') {
      const user = await requireUser()
      await ownedSite(siteMatch[1])
      const input = sanitizeSite(body)
      await verifyLinkedProject(input.form_project_id, user.id)
      const { data, error } = await supabase.from('form_maker_sites').update(input).eq('id', siteMatch[1]).eq('owner_id', user.id).select().single()
      if (error?.code === '23505') throw new ApiError('이미 사용 중인 사이트 주소입니다.', 409, error)
      if (error) fail(error, '홍보 사이트를 저장하지 못했습니다.')
      return { site: serializeSite(data) }
    }
    if (siteMatch && method === 'DELETE') {
      const current = await ownedSite(siteMatch[1])
      const { error } = await supabase.from('form_maker_sites').delete().eq('id', siteMatch[1]).eq('owner_id', current.owner_id)
      if (error) fail(error, '홍보 사이트를 삭제하지 못했습니다.')
      const imageUrls = (current.content?.sections || []).map((section) => section?.data?.imageUrl).filter(Boolean)
      await removeOwnedAssets(imageUrls, current.owner_id).catch(() => {})
      return null
    }

    const projectMatch = path.match(/^\/maker\/projects\/([^/]+)$/)
    if (projectMatch && method === 'GET') {
      const row = await ownedProject(projectMatch[1])
      const meta = await projectMetaMap([row.id])
      return { project: serializeProject(row, meta.get(row.id)) }
    }
    if (projectMatch && method === 'PUT') {
      const input = sanitizeProject(body)
      const { data, error } = await supabase.from('form_maker_projects').update(input).eq('id', projectMatch[1]).select().single()
      if (error?.code === '23505') throw new ApiError('이미 사용 중인 공개 주소입니다.', 409, error)
      if (error) fail(error)
      const meta = await saveProjectMeta(data.id, body)
      const latestMeta = await projectMetaMap([data.id])
      let project = serializeProject(data, { ...latestMeta.get(data.id), ...meta })
      if (project.status === 'published') {
        const connected = await ensureBackupSheet(project.id).catch(() => null)
        if (connected?.project) project = connected.project
      }
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
