export const FIELD_TYPES = [
  ['short', '짧은 답변'],
  ['long', '긴 답변'],
  ['email', '이메일'],
  ['phone', '전화번호'],
  ['number', '숫자'],
  ['date', '날짜'],
  ['single', '하나만 선택'],
  ['multi', '여러 개 선택'],
  ['select', '드롭다운'],
  ['rating', '별점'],
  ['consent', '동의 확인'],
  ['heading', '설명 블록'],
]

export const FIELD_GROUPS = [
  { label: '텍스트', types: ['short', 'long', 'email', 'phone', 'number'] },
  { label: '선택', types: ['single', 'multi', 'select', 'rating'] },
  { label: '기타', types: ['date', 'consent', 'heading'] },
]

export const TYPE_LABEL = Object.fromEntries(FIELD_TYPES)

export const ACCENT_PRESETS = ['#7156d9', '#3157e8', '#13866f', '#d8436b', '#cc5b24', '#27313d']

export const FONT_PRESETS = [
  ['pretendard', '깔끔한 고딕'],
  ['rounded', '부드러운 고딕'],
  ['serif', '감성적인 명조'],
]

export const FONT_STACKS = {
  pretendard: '"Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif',
  rounded: '"Arial Rounded MT Bold", "Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif',
  serif: '"Noto Serif KR", "Nanum Myeongjo", Georgia, serif',
}

export function makeField(type = 'short') {
  const labels = {
    short: '이름을 입력해 주세요',
    long: '자세한 내용을 알려주세요',
    email: '이메일 주소를 입력해 주세요',
    phone: '연락처를 입력해 주세요',
    number: '숫자를 입력해 주세요',
    date: '날짜를 선택해 주세요',
    single: '하나를 선택해 주세요',
    multi: '해당하는 항목을 모두 선택해 주세요',
    select: '목록에서 선택해 주세요',
    rating: '만족도를 알려주세요',
    consent: '개인정보 수집 및 이용에 동의합니다',
    heading: '안내 제목',
  }
  return {
    id: crypto.randomUUID(),
    type,
    label: labels[type] || labels.short,
    description: type === 'heading' ? '응답자에게 필요한 안내를 적어주세요.' : '',
    placeholder: '',
    required: !['heading'].includes(type),
    options: ['선택 1', '선택 2'],
    scale: 5,
  }
}

export function makePage(index = 0) {
  return {
    id: crypto.randomUUID(),
    title: index === 0 ? '기본 정보' : `새 페이지 ${index + 1}`,
    description: '',
    fields: index === 0 ? [makeField('short'), makeField('email')] : [makeField('short')],
  }
}

export function emptyProject() {
  return {
    title: '제목 없는 폼',
    slug: '',
    description: '간단한 안내 문구를 적어주세요.',
    pages: [makePage(0)],
    theme: {
      accent: '#7156d9',
      background: '#f0edfb',
      card: '#ffffff',
      text: '#222131',
      radius: 24,
      coverUrl: '',
      showProgress: true,
      layout: 'focus',
      font: 'pretendard',
    },
    settings: {
      successTitle: '응답이 접수되었습니다',
      successMessage: '참여해 주셔서 감사합니다.',
      submitLabel: '제출하기',
    },
    status: 'draft',
  }
}

export function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function allFields(project) {
  return (project?.pages || []).flatMap((page) => page.fields || []).filter((field) => field.type !== 'heading')
}

export function responseRows(project, responses) {
  const fields = allFields(project)
  return [
    ['제출 시각', ...fields.map((field) => field.label), 'Google Sheets'],
    ...responses.map((response) => [
      new Date(response.submittedAt).toLocaleString('ko-KR'),
      ...fields.map((field) => {
        const value = response.answers[field.id]
        return Array.isArray(value) ? value.join(', ') : value ?? ''
      }),
      response.sheetSyncStatus,
    ]),
  ]
}
