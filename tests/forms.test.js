import { describe, expect, it } from 'vitest'
import { moveItem, normalizeMemoColor, responseRows, THEME_PRESETS } from '../src/lib/maker'
import { normalizeSlug, sanitizeProject, validateAnswers } from '../src/lib/validation'

const page = (fields) => [{ id: 'p1', title: '기본 정보', fields }]

describe('form maker validation', () => {
  it('reorders pages and questions without changing the original list', () => {
    const original = ['첫째', '둘째', '셋째']
    expect(moveItem(original, 0, 2)).toEqual(['둘째', '셋째', '첫째'])
    expect(moveItem(original, 2, 0)).toEqual(['셋째', '첫째', '둘째'])
    expect(original).toEqual(['첫째', '둘째', '셋째'])
  })

  it('keeps supported memo colors and falls back safely', () => {
    expect(normalizeMemoColor('mint')).toBe('mint')
    expect(normalizeMemoColor('unknown-color')).toBe('lemon')
  })

  it('includes editable stock and crypto themes', () => {
    const stock = THEME_PRESETS.find((preset) => preset.id === 'stock-market')
    const crypto = THEME_PRESETS.find((preset) => preset.id === 'crypto-neon')
    expect(stock).toMatchObject({ name: '주식 마켓', art: 'stock' })
    expect(crypto).toMatchObject({ name: '코인 네온', art: 'coin' })
    expect(sanitizeProject({ title: '금융 폼', pages: page([]), theme: stock.theme }).theme).toMatchObject(stock.theme)
    expect(sanitizeProject({ title: '금융 폼', pages: page([]), theme: crypto.theme }).theme).toMatchObject(crypto.theme)
  })

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
    const project = sanitizeProject({ title: '글자 설정 폼', pages: page([]), theme: { font: 'black-han', titleSize: 200, questionSize: 10, bodySize: 50 } })
    expect(project.theme.font).toBe('black-han')
    expect(project.theme.titleSize).toBe(72)
    expect(project.theme.questionSize).toBe(20)
    expect(project.theme.bodySize).toBe(22)
  })

  it('stores page-specific typography without changing the form defaults', () => {
    const project = sanitizeProject({
      title: '페이지별 글자 폼',
      pages: [{ ...page([])[0], typography: { titleSize: 34, questionSize: 99, bodySize: 8 } }],
      theme: { titleSize: 60, questionSize: 30, bodySize: 17 },
    })
    expect(project.theme).toMatchObject({ titleSize: 60, questionSize: 30, bodySize: 17 })
    expect(project.pages[0].typography).toEqual({ titleSize: 34, questionSize: 48, bodySize: 12 })
  })

  it('stores supported visual effects and rejects unknown animation settings', () => {
    const supported = sanitizeProject({ title: '효과 폼', pages: page([]), theme: { effect: 'liquid', motion: 'playful' } })
    const fallback = sanitizeProject({ title: '효과 폼', pages: page([]), theme: { effect: 'webgl-magic', motion: 'fastest' } })
    expect(supported.theme.effect).toBe('liquid')
    expect(supported.theme.motion).toBe('playful')
    expect(fallback.theme.effect).toBe('aurora')
    expect(fallback.theme.motion).toBe('soft')
  })

  it('stores image placement and screen transition controls within safe ranges', () => {
    const project = sanitizeProject({
      title: '미디어 폼',
      pages: page([]),
      theme: {
        imageMode: 'card',
        imageFit: 'contain',
        imagePositionX: -20,
        imagePositionY: 120,
        imageScale: 999,
        imageHeight: 40,
        imageOpacity: 2,
        imageBrightness: 200,
        imageOverlay: 90,
        transition: 'flip',
        transitionSpeed: 1200,
      },
    })

    expect(project.theme).toMatchObject({
      imageMode: 'card',
      imageFit: 'contain',
      imagePositionX: 0,
      imagePositionY: 100,
      imageScale: 180,
      imageHeight: 120,
      imageOpacity: 20,
      imageBrightness: 140,
      imageOverlay: 70,
      transition: 'flip',
      transitionSpeed: 900,
    })
  })

  it('keeps intentionally blank form copy while filling missing copy defaults', () => {
    const project = sanitizeProject({ title: '문구 폼', pages: page([]), settings: { coverKicker: '', nextLabel: '계속' } })
    expect(project.settings.coverKicker).toBe('')
    expect(project.settings.nextLabel).toBe('계속')
    expect(project.settings.startLabel).toBe('시작하기')
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

  it('exports response data without internal backup status', () => {
    const project = { pages: page([{ id: 'q1', type: 'short', label: '이름' }]) }
    const rows = responseRows(project, [{
      submittedAt: '2026-08-04T09:00:00.000Z',
      qualityStatus: 'normal',
      qualityReasons: [],
      answers: { q1: '홍길동' },
      sheetSyncStatus: 'failed',
    }])

    expect(rows[0]).toEqual(['제출 시각', 'DB 판정', '판정 사유', '이름'])
    expect(rows[1]).toHaveLength(4)
    expect(rows.flat()).not.toContain('failed')
  })
})
