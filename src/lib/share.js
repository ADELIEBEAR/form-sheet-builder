export function shareVersion(updatedAt) {
  const timestamp = new Date(updatedAt || '').getTime()
  return Number.isFinite(timestamp) ? timestamp.toString(36) : ''
}

export function publicFormPath(project) {
  const slug = encodeURIComponent(String(project?.slug || '').trim())
  const version = shareVersion(project?.updatedAt)
  return `/s/${slug}${version ? `?v=${version}` : ''}`
}

export function publicFormUrl(project, origin = window.location.origin) {
  return new URL(publicFormPath(project), origin).toString()
}

export function publicSitePath(site) {
  const slug = encodeURIComponent(String(site?.slug || '').trim())
  const version = shareVersion(site?.updatedAt)
  return `/p/${slug}${version ? `?v=${version}` : ''}`
}

export function publicSiteUrl(site, origin = window.location.origin) {
  return new URL(publicSitePath(site), origin).toString()
}
