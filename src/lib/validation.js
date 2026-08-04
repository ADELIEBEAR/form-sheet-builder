import { EFFECT_PRESETS, FIELD_TYPES, FONT_PRESETS, MOTION_PRESETS, TRANSITION_PRESETS } from './maker'

const allowedTypes = new Set(FIELD_TYPES.map(([type]) => type))
const allowedFonts = new Set(FONT_PRESETS.map(([font]) => font))
const allowedEffects = new Set(EFFECT_PRESETS.map(([effect]) => effect))
const allowedMotions = new Set(MOTION_PRESETS.map(([motion]) => motion))
const allowedTransitions = new Set(TRANSITION_PRESETS.map(([transition]) => transition))
const allowedImageModes = new Set(['background', 'banner', 'card'])
const allowedImageFits = new Set(['cover', 'contain'])

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

function safeSize(value, fallback, min, max) {
  const size = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(size) ? size : fallback))
}

function safeText(value, fallback, maxLength) {
  return String(value == null ? fallback : value).slice(0, maxLength)
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
  const radius = requestedRadius === '' || requestedRadius == null ? 24 : Number(requestedRadius)
  const layout = input?.theme?.layout === 'card' ? 'card' : 'focus'
  const imageMode = allowedImageModes.has(input?.theme?.imageMode)
    ? input.theme.imageMode
    : layout === 'card' ? 'banner' : 'background'
  if (coverUrl.startsWith('data:')) throw new ValidationError('이미지는 DB에 직접 저장할 수 없습니다. 업로드 기능을 이용해 주세요.')
  return {
    title,
    slug: normalizeSlug(input?.slug, title),
    description: String(input?.description || '').slice(0, 3000),
    pages,
    theme: {
      accent: safeColor(input?.theme?.accent, '#7156d9'),
      background: safeColor(input?.theme?.background, '#f0edfb'),
      card: safeColor(input?.theme?.card, '#ffffff'),
      text: safeColor(input?.theme?.text, '#222131'),
      radius: Math.min(32, Math.max(0, Number.isFinite(radius) ? radius : 24)),
      coverUrl: coverUrl.slice(0, 1000),
      showProgress: input?.theme?.showProgress !== false,
      layout,
      font: allowedFonts.has(input?.theme?.font) ? input.theme.font : 'pretendard',
      titleSize: safeSize(input?.theme?.titleSize, 56, 28, 72),
      questionSize: safeSize(input?.theme?.questionSize, 32, 20, 48),
      bodySize: safeSize(input?.theme?.bodySize, 16, 12, 22),
      effect: allowedEffects.has(input?.theme?.effect) ? input.theme.effect : 'aurora',
      motion: allowedMotions.has(input?.theme?.motion) ? input.theme.motion : 'soft',
      transition: allowedTransitions.has(input?.theme?.transition) ? input.theme.transition : 'rise',
      transitionSpeed: safeSize(input?.theme?.transitionSpeed, 440, 180, 900),
      imageMode,
      imageFit: allowedImageFits.has(input?.theme?.imageFit) ? input.theme.imageFit : 'cover',
      imagePositionX: safeSize(input?.theme?.imagePositionX, 50, 0, 100),
      imagePositionY: safeSize(input?.theme?.imagePositionY, 50, 0, 100),
      imageScale: safeSize(input?.theme?.imageScale, 100, 100, 180),
      imageHeight: safeSize(input?.theme?.imageHeight, 220, 120, 420),
      imageOpacity: safeSize(input?.theme?.imageOpacity, 100, 20, 100),
      imageBrightness: safeSize(input?.theme?.imageBrightness, 100, 40, 140),
      imageOverlay: safeSize(input?.theme?.imageOverlay, 28, 0, 70),
    },
    settings: {
      successTitle: safeText(input?.settings?.successTitle, '응답이 접수되었습니다', 200),
      successMessage: safeText(input?.settings?.successMessage, '참여해 주셔서 감사합니다.', 1000),
      submitLabel: safeText(input?.settings?.submitLabel, '제출하기', 80),
      coverKicker: safeText(input?.settings?.coverKicker, 'WELCOME', 80),
      startStatusLabel: safeText(input?.settings?.startStatusLabel, '시작', 40),
      completeStatusLabel: safeText(input?.settings?.completeStatusLabel, '완료', 40),
      startLabel: safeText(input?.settings?.startLabel, '시작하기', 80),
      pageLabel: safeText(input?.settings?.pageLabel, 'PAGE', 40),
      requiredLabel: safeText(input?.settings?.requiredLabel, '필수', 40),
      previousLabel: safeText(input?.settings?.previousLabel, '이전', 60),
      nextLabel: safeText(input?.settings?.nextLabel, '다음', 60),
      submitPendingLabel: safeText(input?.settings?.submitPendingLabel, '저장 중', 60),
      restartLabel: safeText(input?.settings?.restartLabel, '처음부터 보기', 80),
      answerPlaceholder: safeText(input?.settings?.answerPlaceholder, '답변을 입력해 주세요', 120),
      selectPlaceholder: safeText(input?.settings?.selectPlaceholder, '선택해 주세요', 120),
      consentLabel: safeText(input?.settings?.consentLabel, '내용을 확인했으며 동의합니다.', 300),
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
