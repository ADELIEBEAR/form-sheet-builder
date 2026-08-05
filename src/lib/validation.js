import { EFFECT_PRESETS, FIELD_TYPES, FONT_PRESETS, MOTION_PRESETS, TRANSITION_PRESETS } from './maker'

const allowedTypes = new Set(FIELD_TYPES.map(([type]) => type))
const allowedFonts = new Set(FONT_PRESETS.map(([font]) => font))
const allowedEffects = new Set(EFFECT_PRESETS.map(([effect]) => effect))
const allowedMotions = new Set(MOTION_PRESETS.map(([motion]) => motion))
const allowedTransitions = new Set(TRANSITION_PRESETS.map(([transition]) => transition))
const allowedImageModes = new Set(['background', 'banner', 'card'])
const allowedImageFits = new Set(['cover', 'contain'])
const allowedTextAlignments = new Set(['left', 'center'])

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

function sanitizeDirectTextStyle(input, fallbackSize, minSize, maxSize) {
  if (!input || typeof input !== 'object') return null
  return {
    font: allowedFonts.has(input.font) ? input.font : 'pretendard',
    size: safeSize(input.size, fallbackSize, minSize, maxSize),
    width: safeSize(input.width, 100, 48, 100),
    offsetX: safeSize(input.offsetX, 0, -120, 120),
    offsetY: safeSize(input.offsetY, 0, -100, 100),
    align: allowedTextAlignments.has(input.align) ? input.align : 'left',
    color: safeColor(input.color, ''),
    colorRanges: Array.isArray(input.colorRanges) ? input.colorRanges.slice(0, 200).map((range) => ({
      start: safeSize(range?.start, 0, 0, 10000),
      end: safeSize(range?.end, 0, 0, 10000),
      color: safeColor(range?.color, ''),
    })).filter((range) => range.color && range.end > range.start) : [],
    colorText: safeText(input.colorText, '', 10000),
  }
}

function sanitizeDirectTextGroup(input, roles) {
  if (!input || typeof input !== 'object') return null
  return Object.fromEntries(roles.map(([key, fallbackSize, minSize, maxSize]) => [key, sanitizeDirectTextStyle(input[key], fallbackSize, minSize, maxSize)]))
}

function safeConsentUrl(value) {
  const input = String(value || '').trim()
  if (!input) return ''
  if (input.length > 1000) throw new ValidationError('동의 안내 링크가 너무 깁니다.')
  try {
    const parsed = new URL(input)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol')
    return parsed.toString()
  } catch {
    throw new ValidationError('동의 안내 링크는 http:// 또는 https:// 주소로 입력해 주세요.')
  }
}

function sanitizeField(field) {
  const type = allowedTypes.has(field?.type) ? field.type : 'short'
  const label = String(field?.label || '').trim().slice(0, 300)
  if (!label) throw new ValidationError('비어 있는 질문이 있습니다.')
  const optionValues = ['single', 'multi', 'select'].includes(type)
    ? [...new Set((Array.isArray(field.options) ? field.options : []).map((option) => String(option).trim().slice(0, 200)).filter(Boolean))].slice(0, 50)
    : []
  if (['single', 'multi', 'select'].includes(type) && optionValues.length === 0) throw new ValidationError(`선택 항목을 하나 이상 만들어 주세요: ${label}`)
  const consentText = type === 'consent'
    ? String(field?.consentText == null ? '내용을 확인했으며 동의합니다.' : field.consentText).trim().slice(0, 500)
    : ''
  if (type === 'consent' && !consentText) throw new ValidationError(`동의 체크박스 문구를 입력해 주세요: ${label}`)
  const consentLinkUrl = type === 'consent' ? safeConsentUrl(field?.consentLinkUrl) : ''
  return {
    id: typeof field.id === 'string' && field.id ? field.id.slice(0, 80) : crypto.randomUUID(),
    type,
    label,
    description: String(field.description || '').slice(0, 1000),
    placeholder: String(field.placeholder || '').slice(0, 300),
    required: type !== 'heading' && Boolean(field.required),
    options: optionValues,
    scale: type === 'rating' ? Math.min(10, Math.max(3, Number(field.scale) || 5)) : 5,
    consentText,
    consentLinkLabel: consentLinkUrl ? String(field?.consentLinkLabel || '자세히 보기').trim().slice(0, 120) || '자세히 보기' : '',
    consentLinkUrl,
    directStyles: sanitizeDirectTextGroup(field?.directStyles, [
      ['question', 32, 20, 72],
      ['body', 16, 12, 32],
      ['questionMobile', 32, 20, 48],
      ['bodyMobile', 16, 12, 22],
    ]),
  }
}

function isEmptyAnswer(value) {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0)
}

function consentAccepted(value) {
  if (value === true) return true
  return ['동의', 'true', '1', 'yes'].includes(String(value ?? '').trim().toLowerCase())
}

export function fieldAnswerError(field, value) {
  if (!field || field.type === 'heading') return ''
  const empty = isEmptyAnswer(value)

  if (field.type === 'consent') {
    if (field.required && empty) return '동의 항목을 확인해 주세요.'
    if (!empty && !consentAccepted(value)) return '동의 여부를 다시 확인해 주세요.'
    return ''
  }

  if (field.required && empty) return '이 질문에 답해 주세요.'
  if (empty) return ''

  const text = String(value).trim()
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return '이메일 주소를 확인해 주세요.'
  if (field.type === 'phone') {
    const digits = text.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) return '연락처를 8~15자리 숫자로 입력해 주세요.'
  }
  if (field.type === 'number' && !/^-?\d+(\.\d+)?$/.test(text)) return '숫자 형식을 확인해 주세요.'
  if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(text)) return '날짜를 선택해 주세요.'
  if (['single', 'select'].includes(field.type) && !field.options?.includes(text)) return '목록에 있는 항목을 선택해 주세요.'
  if (field.type === 'multi') {
    if (!Array.isArray(value) || value.some((item) => !field.options?.includes(String(item)))) return '선택 항목을 다시 확인해 주세요.'
  }
  if (field.type === 'rating') {
    const score = Number(text)
    if (!Number.isInteger(score) || score < 1 || score > Number(field.scale || 5)) return '별점 범위를 확인해 주세요.'
  }
  return ''
}

export function sanitizeProject(input) {
  const title = String(input?.title || '').trim().slice(0, 120)
  if (!title) throw new ValidationError('폼 제목을 입력해 주세요.')
  const defaultTitleSize = safeSize(input?.theme?.titleSize, 56, 28, 72)
  const defaultQuestionSize = safeSize(input?.theme?.questionSize, 32, 20, 48)
  const defaultBodySize = safeSize(input?.theme?.bodySize, 16, 12, 22)
  const defaultTitleWeight = safeSize(input?.theme?.titleWeight, 820, 300, 900)
  const defaultQuestionWeight = safeSize(input?.theme?.questionWeight, 760, 300, 900)
  const defaultBodyWeight = safeSize(input?.theme?.bodyWeight, 400, 300, 900)
  const defaultTitleLineHeight = safeSize(input?.theme?.titleLineHeight, 106, 90, 200)
  const defaultQuestionLineHeight = safeSize(input?.theme?.questionLineHeight, 128, 90, 200)
  const defaultBodyLineHeight = safeSize(input?.theme?.bodyLineHeight, 165, 90, 200)
  const defaultTitleTracking = safeSize(input?.theme?.titleTracking, -5.8, -8, 12)
  const defaultQuestionTracking = safeSize(input?.theme?.questionTracking, -4.5, -8, 12)
  const defaultBodyTracking = safeSize(input?.theme?.bodyTracking, 0, -8, 12)
  const defaultTextAlign = allowedTextAlignments.has(input?.theme?.textAlign) ? input.theme.textAlign : 'left'
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
      typography: page?.typography && typeof page.typography === 'object' ? {
        titleSize: safeSize(page.typography.titleSize, defaultTitleSize, 28, 72),
        questionSize: safeSize(page.typography.questionSize, defaultQuestionSize, 20, 48),
        bodySize: safeSize(page.typography.bodySize, defaultBodySize, 12, 22),
        titleWeight: safeSize(page.typography.titleWeight, defaultTitleWeight, 300, 900),
        questionWeight: safeSize(page.typography.questionWeight, defaultQuestionWeight, 300, 900),
        bodyWeight: safeSize(page.typography.bodyWeight, defaultBodyWeight, 300, 900),
        titleLineHeight: safeSize(page.typography.titleLineHeight, defaultTitleLineHeight, 90, 200),
        questionLineHeight: safeSize(page.typography.questionLineHeight, defaultQuestionLineHeight, 90, 200),
        bodyLineHeight: safeSize(page.typography.bodyLineHeight, defaultBodyLineHeight, 90, 200),
        titleTracking: safeSize(page.typography.titleTracking, defaultTitleTracking, -8, 12),
        questionTracking: safeSize(page.typography.questionTracking, defaultQuestionTracking, -8, 12),
        bodyTracking: safeSize(page.typography.bodyTracking, defaultBodyTracking, -8, 12),
        textAlign: allowedTextAlignments.has(page.typography.textAlign) ? page.typography.textAlign : defaultTextAlign,
      } : null,
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
      titleSize: defaultTitleSize,
      questionSize: defaultQuestionSize,
      bodySize: defaultBodySize,
      titleWeight: defaultTitleWeight,
      questionWeight: defaultQuestionWeight,
      bodyWeight: defaultBodyWeight,
      titleLineHeight: defaultTitleLineHeight,
      questionLineHeight: defaultQuestionLineHeight,
      bodyLineHeight: defaultBodyLineHeight,
      titleTracking: defaultTitleTracking,
      questionTracking: defaultQuestionTracking,
      bodyTracking: defaultBodyTracking,
      textAlign: defaultTextAlign,
      directStyles: sanitizeDirectTextGroup(input?.theme?.directStyles, [
        ['coverTitle', defaultTitleSize, 28, 96],
        ['coverBody', defaultBodySize, 12, 40],
        ['successTitle', defaultTitleSize, 28, 72],
        ['successBody', defaultBodySize, 12, 32],
        ['coverTitleMobile', defaultTitleSize, 28, 48],
        ['coverBodyMobile', defaultBodySize, 12, 22],
        ['successTitleMobile', defaultTitleSize, 28, 48],
        ['successBodyMobile', defaultBodySize, 12, 22],
      ]),
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
      shareTitle: input?.settings?.shareTitle == null ? null : safeText(input.settings.shareTitle, '', 100),
      shareDescription: input?.settings?.shareDescription == null ? null : safeText(input.settings.shareDescription, '', 240),
      shareImageMode: input?.settings?.shareImageMode === 'none' ? 'none' : 'cover',
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
      const error = fieldAnswerError(field, selected)
      if (error) throw new ValidationError(`${error}: ${field.label}`)
      answers[field.id] = selected
      continue
    }
    const value = raw == null ? '' : String(raw).trim().slice(0, 10000)
    if (field.type !== 'consent' && field.required && !value) throw new ValidationError(`필수 질문에 답해 주세요: ${field.label}`)
    const error = fieldAnswerError(field, value)
    if (error) throw new ValidationError(`${error}: ${field.label}`)
    answers[field.id] = field.type === 'consent' && consentAccepted(value) ? '동의' : value
  }
  if (JSON.stringify(answers).length > 200000) throw new ValidationError('응답 내용이 너무 큽니다.')
  return answers
}
