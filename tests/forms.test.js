import { describe, expect, it } from 'vitest'
import { AUTO_SAVE_INTERVAL, canAutoSaveProject } from '../src/lib/autosave'
import { changeFieldType, moveItem, normalizeConsentFields, normalizeMemoColor, responseRows, THEME_PRESETS } from '../src/lib/maker'
import { fieldAnswerError, normalizeSlug, sanitizeProject, validateAnswers } from '../src/lib/validation'

const page = (fields) => [{ id: 'p1', title: '기본 정보', fields }]

describe('form maker validation', () => {
  it('autosaves every 15 seconds only when the draft is structurally valid', () => {
    expect(AUTO_SAVE_INTERVAL).toBe(15_000)
    expect(canAutoSaveProject({ title: '신청 폼', pages: page([{ type: 'short', label: '이름' }]) })).toBe(true)
    expect(canAutoSaveProject({ title: '', pages: page([{ type: 'short', label: '이름' }]) })).toBe(false)
    expect(canAutoSaveProject({ title: '신청 폼', pages: page([{ type: 'short', label: '' }]) })).toBe(false)
    expect(canAutoSaveProject({ title: '신청 폼', pages: page([{ type: 'single', label: '선택', options: [] }]) })).toBe(false)
  })

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

  it('initializes usable settings when a saved question changes type', () => {
    expect(changeFieldType({ type: 'heading', required: false, options: [] }, 'single')).toMatchObject({ type: 'single', required: true, options: ['선택 1', '선택 2'] })
    expect(changeFieldType({ type: 'short', required: false, options: [] }, 'consent')).toMatchObject({ type: 'consent', required: true })
    expect(changeFieldType({ type: 'consent', required: true }, 'heading')).toMatchObject({ type: 'heading', required: false })
  })

  it('gives every legacy consent field its own independent checkbox copy', () => {
    const source = page([{ id: 'agree', type: 'consent', label: '개인정보 동의', required: true }])
    const normalized = normalizeConsentFields(source, '내용을 읽고 동의합니다.')

    expect(normalized[0].fields[0]).toMatchObject({ consentText: '내용을 읽고 동의합니다.', consentLinkLabel: '', consentLinkUrl: '' })
    expect(source[0].fields[0].consentText).toBeUndefined()
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

  it('stores a valid Korean font and clamps typography controls', () => {
    const project = sanitizeProject({ title: '글자 설정 폼', pages: page([]), theme: { font: 'black-han', titleSize: 200, questionSize: 10, bodySize: 50, titleWeight: 1200, questionLineHeight: 40, bodyTracking: 30, textAlign: 'right' } })
    expect(project.theme.font).toBe('black-han')
    expect(project.theme.titleSize).toBe(72)
    expect(project.theme.questionSize).toBe(20)
    expect(project.theme.bodySize).toBe(22)
    expect(project.theme.titleWeight).toBe(900)
    expect(project.theme.questionLineHeight).toBe(90)
    expect(project.theme.bodyTracking).toBe(12)
    expect(project.theme.textAlign).toBe('left')
  })

  it('stores page-specific typography without changing the form defaults', () => {
    const project = sanitizeProject({
      title: '페이지별 글자 폼',
      pages: [{ ...page([])[0], typography: { titleSize: 34, questionSize: 99, bodySize: 8, questionWeight: 610, questionLineHeight: 142, questionTracking: -2.4, textAlign: 'center' } }],
      theme: { titleSize: 60, questionSize: 30, bodySize: 17, titleWeight: 700 },
    })
    expect(project.theme).toMatchObject({ titleSize: 60, questionSize: 30, bodySize: 17, titleWeight: 700 })
    expect(project.pages[0].typography).toMatchObject({ titleSize: 34, questionSize: 48, bodySize: 12, questionWeight: 610, questionLineHeight: 142, questionTracking: -2.4, textAlign: 'center' })
  })

  it('sanitizes block and per-character text colors', () => {
    const project = sanitizeProject({
      title: '색상 폼',
      pages: page([{ id: 'q1', type: 'short', label: '이름', directStyles: { question: { color: '#123456', colorText: '이름', colorRanges: [{ start: 0, end: 1, color: '#ff3366' }, { start: 1, end: 2, color: 'bad' }] } } }]),
    })

    expect(project.pages[0].fields[0].directStyles.question).toMatchObject({ color: '#123456', colorText: '이름', colorRanges: [{ start: 0, end: 1, color: '#ff3366' }] })
  })

  it('sanitizes direct canvas text effects and their tuning values', () => {
    const project = sanitizeProject({
      title: '글자 효과 폼',
      pages: page([{ id: 'q1', type: 'short', label: '효과 질문', directStyles: { question: { textEffect: 'glow', effectColor: '#4455cc', effectStrength: 140, effectBlur: -5, effectDistance: 40 }, body: { textEffect: 'unknown', effectColor: 'bad' } } }]),
    })

    expect(project.pages[0].fields[0].directStyles.question).toMatchObject({ textEffect: 'glow', effectColor: '#4455cc', effectStrength: 100, effectBlur: 0, effectDistance: 18 })
    expect(project.pages[0].fields[0].directStyles.body).toMatchObject({ textEffect: 'none', effectColor: '#5f50a4' })
  })

  it('stores direct canvas text placement within mobile-safe bounds', () => {
    const project = sanitizeProject({
      title: '직접 편집 폼',
      pages: page([{ id: 'q1', type: 'short', label: '바로 움직일 질문', directStyles: { question: { font: 'hahmlet', size: 66, width: 72, offsetX: 999, offsetY: -999, align: 'center' }, questionMobile: { font: 'gowun', size: 80, width: 68, offsetX: 16, offsetY: -24, align: 'left' } } }]),
      theme: { directStyles: { coverTitle: { font: 'unknown', size: 120, width: 12, offsetX: -500, offsetY: 500, align: 'right' }, coverTitleMobile: { font: 'jua', size: 80, width: 84, offsetX: 24, offsetY: -16, align: 'center' } } },
    })

    expect(project.pages[0].fields[0].directStyles.question).toMatchObject({ font: 'hahmlet', size: 66, width: 72, offsetX: 120, offsetY: -100, align: 'center' })
    expect(project.pages[0].fields[0].directStyles.questionMobile).toMatchObject({ font: 'gowun', size: 48, width: 68, offsetX: 16, offsetY: -24, align: 'left' })
    expect(project.theme.directStyles.coverTitle).toMatchObject({ font: 'pretendard', size: 96, width: 48, offsetX: -120, offsetY: 100, align: 'left' })
    expect(project.theme.directStyles.coverTitleMobile).toMatchObject({ font: 'jua', size: 48, width: 84, offsetX: 24, offsetY: -16, align: 'center' })
  })

  it('stores button placement with separate desktop and mobile bounds', () => {
    const project = sanitizeProject({
      title: '버튼 배치 폼',
      pages: page([]),
      theme: { buttonStyles: { start: { width: 420, offsetX: -300, offsetY: 120 }, primaryMobile: { width: 310, offsetX: 120, offsetY: -80 }, restartMobile: { width: 30, offsetX: 0, offsetY: 0 } } },
    })

    expect(project.theme.buttonStyles.start).toEqual({ width: 360, offsetX: -300, offsetY: 120 })
    expect(project.theme.buttonStyles.primaryMobile).toEqual({ width: 280, offsetX: 120, offsetY: -80 })
    expect(project.theme.buttonStyles.restartMobile).toEqual({ width: 112, offsetX: 0, offsetY: 0 })
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
        transition: 'bounce',
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
      transition: 'bounce',
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

  it('requires an explicit consent value and normalizes an accepted value', () => {
    const consentPage = page([{ id: 'agree', type: 'consent', label: '개인정보 수집에 동의합니다', required: true }])
    expect(fieldAnswerError(consentPage[0].fields[0], '')).toBe('동의 항목을 확인해 주세요.')
    expect(() => validateAnswers(consentPage, { agree: '아니오' })).toThrow('동의 여부')
    expect(validateAnswers(consentPage, { agree: '동의' }).agree).toBe('동의')
  })

  it('stores independent consent copy and only safe agreement links', () => {
    const project = sanitizeProject({
      title: '동의 폼',
      pages: page([{ id: 'agree', type: 'consent', label: '개인정보 처리 동의', description: '수집 목적을 확인해 주세요.', consentText: '개인정보 수집 및 이용에 동의합니다.', consentLinkLabel: '처리방침 보기', consentLinkUrl: 'https://example.com/privacy', required: true }]),
    })

    expect(project.pages[0].fields[0]).toMatchObject({ label: '개인정보 처리 동의', consentText: '개인정보 수집 및 이용에 동의합니다.', consentLinkLabel: '처리방침 보기', consentLinkUrl: 'https://example.com/privacy' })
    expect(() => sanitizeProject({ title: '빈 동의', pages: page([{ id: 'agree', type: 'consent', label: '동의', consentText: ' ' }]) })).toThrow('체크박스 문구')
    expect(() => sanitizeProject({ title: '위험 링크', pages: page([{ id: 'agree', type: 'consent', label: '동의', consentText: '동의합니다.', consentLinkUrl: 'javascript:alert(1)' }]) })).toThrow('http:// 또는 https://')
  })

  it('validates phone, number, date, and choice values consistently', () => {
    expect(fieldAnswerError({ type: 'phone' }, '123')).toContain('8~15자리')
    expect(fieldAnswerError({ type: 'number' }, '십')).toContain('숫자')
    expect(fieldAnswerError({ type: 'date' }, '내일')).toContain('날짜')
    expect(fieldAnswerError({ type: 'single', options: ['A'] }, 'B')).toContain('목록')
  })

  it('rejects a choice question that has no usable options', () => {
    expect(() => sanitizeProject({ title: '빈 선택지 폼', pages: page([{ id: 'q1', type: 'single', label: '선택', options: ['', ' '] }]) })).toThrow('선택 항목을 하나 이상')
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
