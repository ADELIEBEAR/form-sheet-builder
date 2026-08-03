export const QUESTION_TYPES = [
  ['short', '단답형'],
  ['long', '장문형'],
  ['email', '이메일'],
  ['phone', '전화번호'],
  ['number', '숫자'],
  ['date', '날짜'],
  ['radio', '단일 선택'],
  ['checkbox', '다중 선택'],
  ['notice', '안내 문구'],
]

export const defaultTheme = {
  accent: '#0f766e',
  surface: '#f3f7f6',
  coverUrl: '',
}

export function createQuestion(type = 'short') {
  return {
    id: crypto.randomUUID(),
    type,
    label: type === 'notice' ? '안내 문구를 입력하세요' : '질문을 입력하세요',
    description: '',
    placeholder: '',
    required: false,
    options: ['선택 1', '선택 2'],
  }
}

export function emptyForm() {
  return {
    title: '제목 없는 폼',
    description: '',
    slug: '',
    questions: [createQuestion('short')],
    theme: { ...defaultTheme },
    successMessage: '응답이 제출되었습니다. 참여해주셔서 감사합니다.',
    isPublished: false,
  }
}

export function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function responseRows(form, responses) {
  const questions = form.questions.filter((question) => question.type !== 'notice')
  return [
    ['제출 시각', ...questions.map((question) => question.label), '시트 동기화'],
    ...responses.map((response) => [
      new Date(response.submittedAt).toLocaleString('ko-KR'),
      ...questions.map((question) => {
        const value = response.answers[question.id]
        return Array.isArray(value) ? value.join(', ') : value ?? ''
      }),
      response.sheetSyncStatus,
    ]),
  ]
}
