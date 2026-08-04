import { emptyProject, makeField } from './maker'

function field(type, label, options = {}) {
  return { ...makeField(type), label, ...options }
}

function page(title, fields, description = '') {
  return { id: crypto.randomUUID(), title, description, fields }
}

const definitions = [
  {
    id: 'contact',
    title: '문의 접수',
    description: '고객 문의와 상담 신청을 한 번에 받습니다.',
    accent: '#7156d9',
    questions: 4,
    pages: () => [page('문의자 정보', [
      field('short', '이름을 알려주세요'),
      field('email', '답변받을 이메일을 입력해 주세요'),
      field('phone', '연락 가능한 전화번호를 입력해 주세요', { required: false }),
      field('long', '어떤 도움이 필요한가요?'),
    ])],
  },
  {
    id: 'reservation',
    title: '예약 신청',
    description: '원하는 일정과 연락처를 깔끔하게 수집합니다.',
    accent: '#3157e8',
    questions: 5,
    pages: () => [page('예약 정보', [
      field('short', '예약자 이름을 알려주세요'),
      field('phone', '연락처를 입력해 주세요'),
      field('date', '희망 날짜를 선택해 주세요'),
      field('single', '희망 시간대를 선택해 주세요', { options: ['오전', '오후', '저녁'] }),
      field('long', '추가로 전할 내용이 있나요?', { required: false }),
    ])],
  },
  {
    id: 'feedback',
    title: '만족도 조사',
    description: '경험과 개선 의견을 짧고 편하게 묻습니다.',
    accent: '#d8436b',
    questions: 4,
    pages: () => [page('이용 경험', [
      field('rating', '전반적으로 얼마나 만족하셨나요?', { scale: 5 }),
      field('single', '가장 만족한 부분을 골라주세요', { options: ['서비스', '품질', '속도', '가격'] }),
      field('long', '좋았던 점을 들려주세요', { required: false }),
      field('long', '개선되었으면 하는 점이 있나요?', { required: false }),
    ])],
  },
  {
    id: 'event',
    title: '행사 참가 신청',
    description: '참가자 정보와 참석 방식을 미리 확인합니다.',
    accent: '#13866f',
    questions: 5,
    pages: () => [page('참가자 정보', [
      field('short', '참가자 이름을 알려주세요'),
      field('email', '안내받을 이메일을 입력해 주세요'),
      field('single', '참석 방식을 선택해 주세요', { options: ['현장 참석', '온라인 참석'] }),
      field('long', '미리 남길 질문이 있나요?', { required: false }),
      field('consent', '개인정보 수집 및 이용에 동의합니다'),
    ])],
  },
]

export const FORM_TEMPLATES = definitions.map(({ pages, ...template }) => template)

export function createTemplateProject(templateId) {
  const definition = definitions.find((template) => template.id === templateId)
  if (!definition) return emptyProject()
  const base = emptyProject()
  return {
    ...base,
    title: definition.title,
    slug: `${definition.id}-${crypto.randomUUID().slice(0, 7)}`,
    description: definition.description,
    pages: definition.pages(),
    theme: { ...base.theme, accent: definition.accent },
  }
}
