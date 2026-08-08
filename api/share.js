import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ncvjuwkfjcqktcwyphew.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bW7m17SD5qnFvgW1dbisUQ_iWONmlaB'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function safeImageUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export function shareMetadata(project, pageUrl) {
  const settings = project?.settings && typeof project.settings === 'object' ? project.settings : {}
  const theme = project?.theme && typeof project.theme === 'object' ? project.theme : {}
  const title = String(settings.shareTitle || project?.title || '폼메이커').trim().slice(0, 100)
  const hasCustomDescription = Object.prototype.hasOwnProperty.call(settings, 'shareDescription') && settings.shareDescription != null
  const description = String(hasCustomDescription ? settings.shareDescription : project?.description || '').trim().slice(0, 240)
  const image = settings.shareImageMode === 'none' ? '' : safeImageUrl(theme.coverUrl)
  return { title, description, image, pageUrl }
}

export function siteShareMetadata(site, pageUrl) {
  const sections = Array.isArray(site?.content?.sections) ? site.content.sections : []
  const hero = sections.find((section) => section?.type === 'hero')?.data || {}
  const story = sections.find((section) => section?.type === 'story' && section?.data?.imageUrl)?.data || {}
  const title = String(site?.title || hero.title || '신청 안내').trim().slice(0, 100)
  const description = String(hero.description || '').trim().slice(0, 240)
  const image = safeImageUrl(hero.imageUrl || story.imageUrl)
  return { title, description, image, pageUrl }
}

export function injectShareMetadata(indexHtml, metadata) {
  const title = escapeHtml(metadata.title)
  const description = escapeHtml(metadata.description)
  const pageUrl = escapeHtml(metadata.pageUrl)
  const image = escapeHtml(metadata.image)
  const tags = [
    `<meta name="description" content="${description}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ]
  if (image) {
    tags.push(`<meta property="og:image" content="${image}" />`)
    tags.push(`<meta property="og:image:alt" content="${title}" />`)
    tags.push(`<meta name="twitter:image" content="${image}" />`)
  }

  const shareMetaPattern = /\s*<meta\s+(?:name|property)=["'](?:description|og:(?:type|site_name|title|description|url|image|image:alt)|twitter:(?:card|title|description|image))["'][^>]*>/gi
  return String(indexHtml)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(shareMetaPattern, '')
    .replace('</head>', `    ${tags.join('\n    ')}\n  </head>`)
}

async function loadPublishedProject(slug) {
  const params = new URLSearchParams({
    select: 'slug,title,description,settings,theme',
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: '1',
  })
  const response = await fetch(`${SUPABASE_URL}/rest/v1/form_maker_projects?${params}`, {
    headers: { apikey: SUPABASE_KEY, accept: 'application/json' },
  })
  if (!response.ok) return null
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) ? rows[0] || null : null
}

async function loadPublishedSite(slug) {
  const params = new URLSearchParams({
    select: 'slug,title,content,theme,settings',
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: '1',
  })
  const response = await fetch(`${SUPABASE_URL}/rest/v1/form_maker_sites?${params}`, {
    headers: { apikey: SUPABASE_KEY, accept: 'application/json' },
  })
  if (!response.ok) return null
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) ? rows[0] || null : null
}

async function loadAppShell() {
  const candidates = [join(process.cwd(), 'dist', 'index.html'), join(process.cwd(), 'index.html')]
  for (const path of candidates) {
    try {
      const html = await readFile(path, 'utf8')
      if (html.includes('id="root"') && html.includes('<script')) return html
    } catch { /* try the next bundled location */ }
  }
  throw new Error('App shell unavailable')
}

export default async function handler(request, response) {
  const rawSlug = Array.isArray(request.query?.slug) ? request.query.slug[0] : request.query?.slug
  const rawVersion = Array.isArray(request.query?.v) ? request.query.v[0] : request.query?.v
  const rawType = Array.isArray(request.query?.type) ? request.query.type[0] : request.query?.type
  const slug = String(rawSlug || '').normalize('NFKC').slice(0, 64)
  const version = /^[a-z0-9_-]{1,32}$/i.test(String(rawVersion || '')) ? String(rawVersion) : ''
  const type = rawType === 'site' ? 'site' : 'form'
  try {
    const indexHtml = await loadAppShell()
    if (!/^[\p{L}\p{N}-]{1,64}$/u.test(slug)) {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      return response.status(200).send(indexHtml)
    }

    const record = type === 'site' ? await loadPublishedSite(slug) : await loadPublishedProject(slug)
    const route = type === 'site' ? 'p' : 's'
    const pageUrl = `https://form-maker-next.vercel.app/${route}/${encodeURIComponent(slug)}${version ? `?v=${encodeURIComponent(version)}` : ''}`
    const metadata = type === 'site' ? siteShareMetadata(record, pageUrl) : shareMetadata(record, pageUrl)
    const html = record ? injectShareMetadata(indexHtml, metadata) : indexHtml
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response.status(200).send(html)
  } catch {
    response.setHeader('content-type', 'text/html; charset=utf-8')
    return response.status(500).send('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>페이지를 열 수 없습니다</title></head><body><p>잠시 후 다시 시도해 주세요.</p></body></html>')
  }
}
