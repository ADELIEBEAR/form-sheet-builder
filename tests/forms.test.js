import { describe, expect, it } from 'vitest'
import { normalizeSlug, validateAnswers, validateFormInput } from '../worker/forms'

describe('form validation', () => {
  it('normalizes a readable Korean slug', () => {
    expect(normalizeSlug(' 신규 상담 신청 ', '제목')).toBe('신규-상담-신청')
  })

  it('limits fields and normalizes options', () => {
    const form = validateFormInput({
      title: '상담 신청',
      questions: [{ id: 'q1', type: 'radio', label: '관심 분야', required: true, options: [' 주식 ', '', '코인'] }],
      theme: { accent: '#0f766e', surface: '#f3f7f6', coverUrl: '/media/user/image.webp' },
    })
    expect(form.questions[0].options).toEqual(['주식', '코인'])
    expect(form.theme.coverUrl).toBe('/media/user/image.webp')
  })

  it('rejects a missing required response', () => {
    expect(() => validateAnswers([{ id: 'q1', type: 'short', label: '이름', required: true }], {})).toThrow('필수 질문')
  })

  it('drops invalid checkbox choices', () => {
    const answers = validateAnswers([{ id: 'q1', type: 'checkbox', label: '선택', options: ['A', 'B'] }], { q1: ['A', 'C'] })
    expect(answers.q1).toEqual(['A'])
  })
})
