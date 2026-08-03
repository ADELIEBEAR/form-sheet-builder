const allowedTypes = new Set(['short', 'long', 'email', 'phone', 'number', 'date', 'radio', 'checkbox', 'notice'])

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

export function sanitizeForm(input) {
  const title = String(input?.title || '').trim().slice(0, 120)
  if (!title) throw new ValidationError('폼 제목을 입력해 주세요.')
  const rawQuestions = Array.isArray(input?.questions) ? input.questions : []
  if (rawQuestions.length > 100) throw new ValidationError('질문은 최대 100개까지 만들 수 있습니다.')
  const questions = rawQuestions.map((question) => {
    const type = allowedTypes.has(question?.type) ? question.type : 'short'
    const label = String(question?.label || '').trim().slice(0, 300)
    if (!label) throw new ValidationError('비어 있는 질문이 있습니다.')
    return {
      id: typeof question.id === 'string' && question.id ? question.id.slice(0, 80) : crypto.randomUUID(),
      type,
      label,
      description: String(question.description || '').slice(0, 1000),
      placeholder: String(question.placeholder || '').slice(0, 300),
      required: Boolean(question.required),
      options: ['radio', 'checkbox'].includes(type)
        ? (Array.isArray(question.options) ? question.options : []).map((option) => String(option).trim().slice(0, 200)).filter(Boolean).slice(0, 50)
        : [],
    }
  })
  const coverUrl = String(input?.theme?.coverUrl || '')
  if (coverUrl.startsWith('data:')) throw new ValidationError('이미지는 DB에 직접 저장할 수 없습니다. 업로드 버튼을 이용해 주세요.')
  return {
    title,
    description: String(input?.description || '').slice(0, 3000),
    slug: normalizeSlug(input?.slug, title),
    questions,
    theme: {
      accent: /^#[0-9a-f]{6}$/i.test(input?.theme?.accent) ? input.theme.accent : '#0f766e',
      surface: /^#[0-9a-f]{6}$/i.test(input?.theme?.surface) ? input.theme.surface : '#f3f7f6',
      coverUrl: coverUrl.slice(0, 1000),
    },
    success_message: String(input?.successMessage || '응답이 제출되었습니다.').slice(0, 1000),
    is_published: Boolean(input?.isPublished),
    updated_at: new Date().toISOString(),
  }
}

export function validateAnswers(questions, input) {
  const source = input && typeof input === 'object' ? input : {}
  const answers = {}
  for (const question of questions) {
    if (question.type === 'notice') continue
    const raw = source[question.id]
    if (question.type === 'checkbox') {
      const selected = Array.isArray(raw) ? raw.map(String).filter((value) => question.options?.includes(value)).slice(0, 50) : []
      if (question.required && selected.length === 0) throw new ValidationError(`필수 질문에 답해 주세요: ${question.label}`)
      answers[question.id] = selected
      continue
    }
    const value = raw == null ? '' : String(raw).trim().slice(0, 10000)
    if (question.required && !value) throw new ValidationError(`필수 질문에 답해 주세요: ${question.label}`)
    if (question.type === 'radio' && value && !question.options?.includes(value)) throw new ValidationError('올바르지 않은 선택 항목입니다.')
    if (question.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ValidationError('이메일 형식을 확인해 주세요.')
    answers[question.id] = value
  }
  if (JSON.stringify(answers).length > 200000) throw new ValidationError('응답 내용이 너무 큽니다.')
  return answers
}
