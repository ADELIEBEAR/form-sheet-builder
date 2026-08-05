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
