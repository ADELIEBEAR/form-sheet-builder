import { describe, expect, it } from 'vitest'
import { normalizeSlug, sanitizeProject, validateAnswers } from '../src/lib/validation'

const page = (fields) => [{ id: 'p1', title: '기본 정보', fields }]

describe('form maker validation', () => {
  it('normalizes a readable Korean slug', () => {
    expect(normalizeSlug(' 신규 상담 신청 ', '제목')).toBe('신규-상담-신청')
  })

  it('normalizes choices and accepts the isolated Storage URL', () => {
    const project = sanitizeProject({
      title: '상담 신청',
      pages: page([{ id: 'q1', type: 'single', label: '관심 분야', required: true, options: [' 주식 ', '', '코인'] }]),
      theme: { accent: '#3157e8', background: '#eef1f8', text: '#1e2430', card: '#ffffff', coverUrl: 'https://example.supabase.co/storage/v1/object/public/form-maker-assets/user/image.webp' },
    })
    expect(project.pages[0].fields[0].options).toEqual(['주식', '코인'])
    expect(project.theme.coverUrl).toContain('/form-maker-assets/')
  })

  it('rejects inline base64 images', () => {
    expect(() => sanitizeProject({ title: '폼', pages: page([]), theme: { coverUrl: 'data:image/png;base64,abc' } })).toThrow('DB에 직접 저장')
  })

  it('keeps a square-corner theme when radius is zero', () => {
    const project = sanitizeProject({ title: '각진 폼', pages: page([]), theme: { radius: 0 } })
    expect(project.theme.radius).toBe(0)
  })

  it('uses the focused question layout and rejects unknown fonts', () => {
    const project = sanitizeProject({ title: '집중형 폼', pages: page([]), theme: { layout: 'focus', font: 'unknown' } })
    expect(project.theme.layout).toBe('focus')
    expect(project.theme.font).toBe('pretendard')
  })

  it('stores a valid Korean font and clamps typography sizes', () => {
    const project = sanitizeProject({ title: '글자 설정 폼', pages: page([]), theme: { font: 'jua', titleSize: 200, questionSize: 10, bodySize: 50 } })
    expect(project.theme.font).toBe('jua')
    expect(project.theme.titleSize).toBe(72)
    expect(project.theme.questionSize).toBe(20)
    expect(project.theme.bodySize).toBe(22)
  })

  it('rejects a missing required response across pages', () => {
    expect(() => validateAnswers(page([{ id: 'q1', type: 'short', label: '이름', required: true }]), {})).toThrow('필수 질문')
  })

  it('drops invalid multiple-choice values', () => {
    const answers = validateAnswers(page([{ id: 'q1', type: 'multi', label: '선택', options: ['A', 'B'] }]), { q1: ['A', 'C'] })
    expect(answers.q1).toEqual(['A'])
  })

  it('rejects ratings outside the configured scale', () => {
    expect(() => validateAnswers(page([{ id: 'q1', type: 'rating', label: '평가', scale: 5 }]), { q1: '8' })).toThrow('별점 범위')
  })
})
