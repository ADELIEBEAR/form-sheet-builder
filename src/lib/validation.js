import { FIELD_TYPES } from './maker'

const allowedTypes = new Set(FIELD_TYPES.map(([type]) => type))

export class ValidationError extends Error {
  name = 'ValidationError'
}

export function normalizeSlug(value, title = 'form') {
  const clean = String(value || title)
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
  return clean || `form-${crypto.randomUUID().slice(0, 7)}`
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback
}

function sanitizeField(field) {
  const type = allowedTypes.has(field?.type) ? field.type : 'short'
  const label = String(field?.label || '').trim().slice(0, 300)
  if (!label) throw new ValidationError('비어 있는 질문이 있습니다.')
  return {
    id: typeof field.id === 'string' && field.id ? field.id.slice(0, 80) : crypto.randomUUID(),
    type,
    label,
    description: String(field.description || '').slice(0, 1000),
    placeholder: String(field.placeholder || '').slice(0, 300),
    required: type !== 'heading' && Boolean(field.required),
    options: ['single', 'multi', 'select'].includes(type)
      ? (Array.isArray(field.options) ? field.options : []).map((option) => String(option).trim().slice(0, 200)).filter(Boolean).slice(0, 50)
      : [],
    scale: type === 'rating' ? Math.min(10, Math.max(3, Number(field.scale) || 5)) : 5,
  }
}

export function sanitizeProject(input) {
  const title = String(input?.title || '').trim().slice(0, 120)
  if (!title) throw new ValidationError('폼 제목을 입력해 주세요.')
  const sourcePages = Array.isArray(input?.pages) ? input.pages : []
  if (!sourcePages.length) throw new ValidationError('페이지가 하나 이상 필요합니다.')
  if (sourcePages.length > 20) throw new ValidationError('페이지는 최대 20개까지 만들 수 있습니다.')
  let fieldCount = 0
  const pages = sourcePages.map((page, pageIndex) => {
    const fields = (Array.isArray(page?.fields) ? page.fields : []).map(sanitizeField)
    fieldCount += fields.length
    return {
      id: typeof page?.id === 'string' && page.id ? page.id.slice(0, 80) : crypto.randomUUID(),
      title: String(page?.title || `페이지 ${pageIndex + 1}`).trim().slice(0, 120),
      description: String(page?.description || '').slice(0, 1000),
      fields,
    }
  })
  if (fieldCount > 150) throw new ValidationError('질문은 최대 150개까지 만들 수 있습니다.')
  const coverUrl = String(input?.theme?.coverUrl || '')
  const requestedRadius = input?.theme?.radius
  const radius = requestedRadius === '' || requestedRadius == null ? 14 : Number(requestedRadius)
  if (coverUrl.startsWith('data:')) throw new ValidationError('이미지는 DB에 직접 저장할 수 없습니다. 업로드 기능을 이용해 주세요.')
  return {
    title,
    slug: normalizeSlug(input?.slug, title),
    description: String(input?.description || '').slice(0, 3000),
    pages,
    theme: {
      accent: safeColor(input?.theme?.accent, '#2f6757'),
      background: safeColor(input?.theme?.background, '#efede7'),
      card: safeColor(input?.theme?.card, '#fffdfa'),
      text: safeColor(input?.theme?.text, '#232724'),
      radius: Math.min(28, Math.max(0, Number.isFinite(radius) ? radius : 14)),
      coverUrl: coverUrl.slice(0, 1000),
      showProgress: input?.theme?.showProgress !== false,
    },
    settings: {
      successTitle: String(input?.settings?.successTitle || '응답이 접수되었습니다').slice(0, 200),
      successMessage: String(input?.settings?.successMessage || '참여해 주셔서 감사합니다.').slice(0, 1000),
      submitLabel: String(input?.settings?.submitLabel || '제출하기').slice(0, 80),
    },
    status: input?.status === 'published' ? 'published' : 'draft',
    updated_at: new Date().toISOString(),
  }
}

export function validateAnswers(pages, input) {
  const source = input && typeof input === 'object' ? input : {}
  const answers = {}
  for (const field of pages.flatMap((page) => page.fields || [])) {
    if (field.type === 'heading') continue
    const raw = source[field.id]
    if (field.type === 'multi') {
      const selected = Array.isArray(raw) ? raw.map(String).filter((value) => field.options?.includes(value)).slice(0, 50) : []
      if (field.required && selected.length === 0) throw new ValidationError(`필수 질문에 답해 주세요: ${field.label}`)
      answers[field.id] = selected
      continue
    }
    const value = raw == null ? '' : String(raw).trim().slice(0, 10000)
    if (field.required && !value) throw new ValidationError(`필수 질문에 답해 주세요: ${field.label}`)
    if (['single', 'select'].includes(field.type) && value && !field.options?.includes(value)) throw new ValidationError('올바르지 않은 선택 항목입니다.')
    if (field.type === 'rating' && value && (Number(value) < 1 || Number(value) > Number(field.scale || 5))) throw new ValidationError('별점 범위를 확인해 주세요.')
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ValidationError('이메일 형식을 확인해 주세요.')
    answers[field.id] = value
  }
  if (JSON.stringify(answers).length > 200000) throw new ValidationError('응답 내용이 너무 큽니다.')
  return answers
}
