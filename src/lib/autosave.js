export const AUTO_SAVE_INTERVAL = 15_000

export function canAutoSaveProject(project) {
  if (!String(project?.title || '').trim()) return false
  if (!Array.isArray(project?.pages) || project.pages.length === 0) return false

  return project.pages.every((page) => Array.isArray(page?.fields) && page.fields.every((field) => {
    if (!String(field?.label || '').trim()) return false
    if (['single', 'multi', 'select'].includes(field.type)) {
      return Array.isArray(field.options) && field.options.some((option) => String(option || '').trim())
    }
    if (field.type === 'consent') return Boolean(String(field.consentText || '').trim())
    return true
  }))
}
