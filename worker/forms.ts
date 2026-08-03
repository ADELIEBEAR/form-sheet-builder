import type { FormRow, Question, ResponseRow } from './types'

const allowedTypes = new Set(['short', 'long', 'email', 'phone', 'number', 'date', 'radio', 'checkbox', 'notice'])

export class ValidationError extends Error {
  name = 'ValidationError'
}

export function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T } catch { return fallback }
}

export function serializeForm(row: FormRow) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    questions: parseJson<Question[]>(row.questions_json, []),
    theme: parseJson<Record<string, string>>(row.theme_json, {}),
    successMessage: row.success_message,
    isPublished: Boolean(row.is_published),
    sheetId: row.sheet_id,
    sheetUrl: row.sheet_url,
    sheetName: row.sheet_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responseCount: row.response_count || 0,
  }
}

export function serializeResponse(row: ResponseRow) {
  return {
    id: row.id,
    formId: row.form_id,
    answers: parseJson<Record<string, unknown>>(row.answers_json, {}),
    sheetSyncStatus: row.sheet_sync_status,
    sheetSyncError: row.sheet_sync_error,
    submittedAt: row.submitted_at,
  }
}

export function normalizeSlug(value: unknown, title: string) {
  const supplied = typeof value === 'string' ? value : ''
  const slug = supplied.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '').replace(/-+/g, '-').slice(0, 72)
  if (slug) return slug
  const titleSlug = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '').replace(/-+/g, '-').slice(0, 48)
  return `${titleSlug || 'form'}-${crypto.randomUUID().slice(0, 7)}`
}

export function validateFormInput(input: any) {
  const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 120) : ''
  if (!title) throw new ValidationError('폼 제목을 입력해주세요.')
  const rawQuestions = Array.isArray(input.questions) ? input.questions : []
  if (rawQuestions.length > 100) throw new ValidationError('질문은 최대 100개까지 만들 수 있습니다.')
  const questions: Question[] = rawQuestions.map((question: any) => {
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
      options: ['radio', 'checkbox'].includes(type) ? (Array.isArray(question.options) ? question.options : []).map((option: unknown) => String(option).trim().slice(0, 200)).filter(Boolean).slice(0, 50) : [],
    }
  })
  const theme = {
    accent: /^#[0-9a-f]{6}$/i.test(input?.theme?.accent) ? input.theme.accent : '#0f766e',
    surface: /^#[0-9a-f]{6}$/i.test(input?.theme?.surface) ? input.theme.surface : '#f3f7f6',
    coverUrl: typeof input?.theme?.coverUrl === 'string' && input.theme.coverUrl.startsWith('/media/') ? input.theme.coverUrl.slice(0, 500) : '',
  }
  return {
    title,
    description: String(input?.description || '').slice(0, 3000),
    questions,
    theme,
    successMessage: String(input?.successMessage || '응답이 제출되었습니다.').slice(0, 1000),
    isPublished: Boolean(input?.isPublished),
  }
}

export function validateAnswers(questions: Question[], input: unknown) {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const answers: Record<string, string | string[]> = {}
  for (const question of questions) {
    if (question.type === 'notice') continue
    const raw = source[question.id]
    if (question.type === 'checkbox') {
      const selected = Array.isArray(raw) ? raw.map(String).filter((value) => question.options?.includes(value)).slice(0, 50) : []
      if (question.required && selected.length === 0) throw new ValidationError(`필수 질문에 답해주세요: ${question.label}`)
      answers[question.id] = selected
      continue
    }
    const value = raw == null ? '' : String(raw).trim().slice(0, 10000)
    if (question.required && !value) throw new ValidationError(`필수 질문에 답해주세요: ${question.label}`)
    if (question.type === 'radio' && value && !question.options?.includes(value)) throw new ValidationError('올바르지 않은 선택 항목입니다.')
    if (question.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ValidationError('이메일 형식을 확인해주세요.')
    answers[question.id] = value
  }
  if (JSON.stringify(answers).length > 200000) throw new ValidationError('응답 내용이 너무 큽니다.')
  return answers
}
