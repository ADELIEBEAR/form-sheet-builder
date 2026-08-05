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
  ['consent', '동의 체크박스'],
  ['heading', '설명 블록'],
]

export const FIELD_GROUPS = [
  { label: '텍스트', types: ['short', 'long', 'email', 'phone', 'number'] },
  { label: '선택', types: ['single', 'multi', 'select', 'rating'] },
  { label: '기타', types: ['date', 'consent', 'heading'] },
]

export const TYPE_LABEL = Object.fromEntries(FIELD_TYPES)

export const ACCENT_PRESETS = ['#7156d9', '#3157e8', '#13866f', '#d8436b', '#cc5b24', '#27313d', '#ed7d31', '#16a1b7', '#9b4f96', '#171717']

export const FONT_PRESETS = [
  ['pretendard', '프리텐다드', '깔끔한 고딕'],
  ['noto-sans', 'Noto Sans', '깔끔한 고딕'],
  ['nanum-gothic', '나눔고딕', '깔끔한 고딕'],
  ['gowun', '고운돋움', '깔끔한 고딕'],
  ['sunflower', '해바라기', '깔끔한 고딕'],
  ['serif', 'Noto Serif', '차분한 명조'],
  ['nanum-myeongjo', '나눔명조', '차분한 명조'],
  ['gowun-batang', '고운바탕', '차분한 명조'],
  ['hahmlet', '함렛', '차분한 명조'],
  ['song-myung', '송명', '차분한 명조'],
  ['jua', '주아', '개성 있는 제목체'],
  ['do-hyeon', '도현', '개성 있는 제목체'],
  ['black-han', '검은고딕', '개성 있는 제목체'],
  ['dongle', '동글', '개성 있는 제목체'],
  ['gugi', '구기', '개성 있는 제목체'],
  ['gaegu', '개구', '손글씨'],
  ['gamja', '감자꽃', '손글씨'],
  ['nanum-pen', '나눔펜', '손글씨'],
  ['nanum-brush', '나눔붓', '손글씨'],
  ['poor-story', '푸어스토리', '손글씨'],
  ['hi-melody', '하이멜로디', '손글씨'],
]

export const FONT_STACKS = {
  pretendard: '"Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif',
  'noto-sans': '"Noto Sans KR", "Pretendard Variable", Pretendard, sans-serif',
  'nanum-gothic': '"Nanum Gothic", "Pretendard Variable", Pretendard, sans-serif',
  gowun: '"Gowun Dodum", "Pretendard Variable", Pretendard, sans-serif',
  sunflower: 'Sunflower, "Pretendard Variable", Pretendard, sans-serif',
  serif: '"Noto Serif KR", "Nanum Myeongjo", Georgia, serif',
  'nanum-myeongjo': '"Nanum Myeongjo", "Noto Serif KR", Georgia, serif',
  'gowun-batang': '"Gowun Batang", "Noto Serif KR", Georgia, serif',
  hahmlet: 'Hahmlet, "Noto Serif KR", Georgia, serif',
  'song-myung': '"Song Myung", "Noto Serif KR", Georgia, serif',
  jua: 'Jua, "Pretendard Variable", Pretendard, sans-serif',
  'do-hyeon': '"Do Hyeon", "Pretendard Variable", Pretendard, sans-serif',
  'black-han': '"Black Han Sans", "Pretendard Variable", Pretendard, sans-serif',
  dongle: 'Dongle, "Pretendard Variable", Pretendard, sans-serif',
  gugi: 'Gugi, "Pretendard Variable", Pretendard, sans-serif',
  gaegu: 'Gaegu, "Pretendard Variable", Pretendard, cursive',
  gamja: '"Gamja Flower", "Pretendard Variable", Pretendard, cursive',
  'nanum-pen': '"Nanum Pen Script", "Pretendard Variable", Pretendard, cursive',
  'nanum-brush': '"Nanum Brush Script", "Pretendard Variable", Pretendard, cursive',
  'poor-story': '"Poor Story", "Pretendard Variable", Pretendard, cursive',
  'hi-melody': '"Hi Melody", "Pretendard Variable", Pretendard, cursive',
}

export const EFFECT_PRESETS = [
  ['aurora', '오로라', '겹쳐 흐르는 은은한 빛'],
  ['liquid', '리퀴드', '말랑한 컬러 방울'],
  ['clouds', '구름', '포근하게 번지는 안개'],
  ['prism', '프리즘', '살짝 회전하는 빛의 결'],
  ['ripple', '물결', '잔잔하게 퍼지는 원'],
  ['grid', '소프트 그리드', '정돈된 종이 질감'],
  ['grain', '필름 그레인', '아날로그한 미세 질감'],
  ['mesh', '메시 그라데이션', '여러 빛이 천천히 섞이는 배경'],
  ['spotlight', '스포트라이트', '중심을 부드럽게 비추는 빛'],
  ['waves', '실크 웨이브', '겹겹이 흐르는 유연한 곡선'],
  ['bloom', '컬러 블룸', '꽃처럼 피어나는 색 번짐'],
  ['starfield', '별빛', '잔잔하게 반짝이는 밤하늘'],
  ['confetti', '컨페티', '가볍게 흩날리는 축하 조각'],
  ['none', '효과 없음', '단색으로 가장 가볍게'],
]

export const MOTION_PRESETS = [
  ['none', '정지'],
  ['calm', '아주 잔잔'],
  ['soft', '부드럽게'],
  ['playful', '통통 튀게'],
  ['cinematic', '시네마틱'],
  ['bouncy', '말랑 통통'],
]

export const TRANSITION_PRESETS = [
  ['rise', '살짝 떠오르기'],
  ['fade', '부드럽게 나타나기'],
  ['slide', '옆으로 넘기기'],
  ['zoom', '가볍게 확대'],
  ['flip', '카드 뒤집기'],
  ['none', '전환 없음'],
]

export const MEMO_COLOR_PRESETS = [
  ['lemon', '레몬'],
  ['lavender', '라벤더'],
  ['mint', '민트'],
  ['sky', '스카이'],
  ['rose', '로즈'],
  ['sand', '샌드'],
  ['slate', '슬레이트'],
]

const memoColorIds = new Set(MEMO_COLOR_PRESETS.map(([value]) => value))

export function normalizeMemoColor(value) {
  const requested = String(value || 'lemon').trim().toLowerCase()
  return memoColorIds.has(requested) ? requested : 'lemon'
}

export const THEME_PRESETS = [
  { id: 'lavender-soft', name: '라벤더 소프트', tag: '차분함', theme: { accent: '#7156d9', background: '#eeeafb', card: '#ffffff', text: '#29243f', radius: 26, font: 'pretendard', effect: 'aurora', motion: 'soft' } },
  { id: 'peach-sorbet', name: '피치 소르베', tag: '따뜻함', theme: { accent: '#ed6f54', background: '#fff0e9', card: '#fffaf7', text: '#3e2926', radius: 30, font: 'gowun', effect: 'liquid', motion: 'soft' } },
  { id: 'mint-soda', name: '민트 소다', tag: '산뜻함', theme: { accent: '#168a77', background: '#e5f8f2', card: '#fbfffd', text: '#193b35', radius: 28, font: 'noto-sans', effect: 'ripple', motion: 'calm' } },
  { id: 'sky-cloud', name: '스카이 클라우드', tag: '편안함', theme: { accent: '#3977d8', background: '#e8f3ff', card: '#ffffff', text: '#21354e', radius: 26, font: 'nanum-gothic', effect: 'clouds', motion: 'calm' } },
  { id: 'butter-cream', name: '버터 크림', tag: '포근함', theme: { accent: '#b66b1b', background: '#fff6d9', card: '#fffdf4', text: '#473617', radius: 22, font: 'gowun-batang', effect: 'grain', motion: 'calm' } },
  { id: 'rose-milk', name: '로즈 밀크', tag: '사랑스러움', theme: { accent: '#cf5077', background: '#fcecf2', card: '#fffafd', text: '#472936', radius: 32, font: 'sunflower', effect: 'liquid', motion: 'playful' } },
  { id: 'paper-beige', name: '페이퍼 베이지', tag: '내추럴', theme: { accent: '#76624d', background: '#eee8de', card: '#fffdf8', text: '#302a24', radius: 12, font: 'hahmlet', effect: 'grain', motion: 'none' } },
  { id: 'forest-calm', name: '포레스트 캄', tag: '신뢰감', theme: { accent: '#2f7658', background: '#dfeadf', card: '#f8fbf6', text: '#223129', radius: 20, font: 'gowun', effect: 'aurora', motion: 'calm' } },
  { id: 'ocean-glass', name: '오션 글라스', tag: '시원함', theme: { accent: '#157caa', background: '#ddecf2', card: '#f8fdff', text: '#173440', radius: 24, font: 'pretendard', effect: 'ripple', motion: 'soft' } },
  { id: 'mono-ink', name: '모노 잉크', tag: '미니멀', theme: { accent: '#1e1e1e', background: '#ededeb', card: '#ffffff', text: '#171717', radius: 8, font: 'pretendard', effect: 'grid', motion: 'none' } },
  { id: 'stock-market', name: '주식 마켓', tag: '데이터 집중', art: 'stock', theme: { accent: '#e3504f', background: '#111821', card: '#1d2732', text: '#f4f1e9', radius: 10, font: 'pretendard', effect: 'grid', motion: 'calm', transition: 'slide', transitionSpeed: 360 } },
  { id: 'crypto-neon', name: '코인 네온', tag: '디지털 자산', art: 'coin', theme: { accent: '#e99a32', background: '#121018', card: '#201b2b', text: '#fbf5e8', radius: 22, font: 'pretendard', effect: 'prism', motion: 'cinematic', transition: 'zoom', transitionSpeed: 420 } },
  { id: 'night-velvet', name: '나이트 벨벳', tag: '프리미엄', theme: { accent: '#7456d6', background: '#161323', card: '#252036', text: '#f5f1ff', radius: 24, font: 'hahmlet', effect: 'prism', motion: 'soft' } },
  { id: 'candy-pop', name: '캔디 팝', tag: '발랄함', theme: { accent: '#7a4ff2', background: '#f7dfef', card: '#fff9fc', text: '#35223a', radius: 32, font: 'jua', effect: 'liquid', motion: 'playful' } },
  { id: 'pearl-light', name: '펄 라이트', tag: '깨끗함', theme: { accent: '#5e63c8', background: '#f0f1f8', card: '#ffffff', text: '#292c42', radius: 22, font: 'pretendard', effect: 'spotlight', motion: 'calm' } },
  { id: 'sage-mesh', name: '세이지 메시', tag: '안정감', theme: { accent: '#38735d', background: '#e4ece5', card: '#fbfdf9', text: '#26352f', radius: 26, font: 'gowun', effect: 'mesh', motion: 'soft' } },
  { id: 'sunset-wave', name: '선셋 웨이브', tag: '감성적', theme: { accent: '#d85f48', background: '#f9e4dc', card: '#fff9f5', text: '#412923', radius: 30, font: 'gowun-batang', effect: 'waves', motion: 'soft' } },
  { id: 'midnight-star', name: '미드나잇 스타', tag: '몰입감', theme: { accent: '#8a77ef', background: '#101526', card: '#1c2338', text: '#f2f4ff', radius: 20, font: 'hahmlet', effect: 'starfield', motion: 'cinematic' } },
  { id: 'lime-bloom', name: '라임 블룸', tag: '생동감', theme: { accent: '#668f24', background: '#eef5d9', card: '#fbfff1', text: '#2d361d', radius: 30, font: 'sunflower', effect: 'bloom', motion: 'bouncy' } },
  { id: 'party-confetti', name: '파티 컨페티', tag: '축하', theme: { accent: '#e0547a', background: '#fff0f5', card: '#fffafd', text: '#422633', radius: 32, font: 'jua', effect: 'confetti', motion: 'playful' } },
]

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
    consent: '개인정보 수집 및 이용 동의',
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
    consentText: type === 'consent' ? '개인정보 수집 및 이용에 동의합니다.' : '',
    consentLinkLabel: '',
    consentLinkUrl: '',
  }
}

export function changeFieldType(field, nextType) {
  const optionType = ['single', 'multi', 'select'].includes(nextType)
  const currentOptions = Array.isArray(field?.options) ? field.options.filter((option) => String(option).trim()) : []
  return {
    ...field,
    type: nextType,
    required: nextType === 'heading' ? false : nextType === 'consent' || field?.type === 'heading' ? true : Boolean(field?.required),
    options: optionType ? (currentOptions.length ? currentOptions : ['선택 1', '선택 2']) : [],
    scale: nextType === 'rating' ? Math.min(10, Math.max(3, Number(field?.scale) || 5)) : 5,
    consentText: nextType === 'consent' ? (field?.consentText || '내용을 확인했으며 동의합니다.') : (field?.consentText || ''),
    consentLinkLabel: field?.consentLinkLabel || '',
    consentLinkUrl: field?.consentLinkUrl || '',
  }
}

export function normalizeConsentFields(pages, defaultConsentText = '내용을 확인했으며 동의합니다.') {
  return (Array.isArray(pages) ? pages : []).map((page) => ({
    ...page,
    fields: (Array.isArray(page?.fields) ? page.fields : []).map((field) => field?.type === 'consent' ? {
      ...field,
      consentText: field.consentText == null ? defaultConsentText : field.consentText,
      consentLinkLabel: field.consentLinkLabel || '',
      consentLinkUrl: field.consentLinkUrl || '',
    } : field),
  }))
}

export function makePage(index = 0) {
  return {
    id: crypto.randomUUID(),
    title: index === 0 ? '기본 정보' : `새 페이지 ${index + 1}`,
    description: '',
    typography: null,
    fields: index === 0 ? [makeField('short'), makeField('email')] : [makeField('short')],
  }
}

export function resolvePageTypography(project, page) {
  const theme = project?.theme || {}
  const typography = page?.typography || {}
  return {
    titleSize: typography.titleSize ?? theme.titleSize ?? 56,
    questionSize: typography.questionSize ?? theme.questionSize ?? 32,
    bodySize: typography.bodySize ?? theme.bodySize ?? 16,
    titleWeight: typography.titleWeight ?? theme.titleWeight ?? 820,
    questionWeight: typography.questionWeight ?? theme.questionWeight ?? 760,
    bodyWeight: typography.bodyWeight ?? theme.bodyWeight ?? 400,
    titleLineHeight: typography.titleLineHeight ?? theme.titleLineHeight ?? 106,
    questionLineHeight: typography.questionLineHeight ?? theme.questionLineHeight ?? 128,
    bodyLineHeight: typography.bodyLineHeight ?? theme.bodyLineHeight ?? 165,
    titleTracking: typography.titleTracking ?? theme.titleTracking ?? -5.8,
    questionTracking: typography.questionTracking ?? theme.questionTracking ?? -4.5,
    bodyTracking: typography.bodyTracking ?? theme.bodyTracking ?? 0,
    textAlign: typography.textAlign ?? theme.textAlign ?? 'left',
  }
}

export function resolveDirectTextStyle(value, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    font: source.font || fallback.font || 'pretendard',
    size: Number.isFinite(Number(source.size)) ? Number(source.size) : (fallback.size ?? 16),
    width: Number.isFinite(Number(source.width)) ? Number(source.width) : 100,
    offsetX: Number.isFinite(Number(source.offsetX)) ? Number(source.offsetX) : 0,
    offsetY: Number.isFinite(Number(source.offsetY)) ? Number(source.offsetY) : 0,
    align: source.align || fallback.align || 'left',
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
      titleSize: 56,
      questionSize: 32,
      bodySize: 16,
      titleWeight: 820,
      questionWeight: 760,
      bodyWeight: 400,
      titleLineHeight: 106,
      questionLineHeight: 128,
      bodyLineHeight: 165,
      titleTracking: -5.8,
      questionTracking: -4.5,
      bodyTracking: 0,
      textAlign: 'left',
      directStyles: null,
      effect: 'aurora',
      motion: 'soft',
      transition: 'rise',
      transitionSpeed: 440,
      imageMode: 'background',
      imageFit: 'cover',
      imagePositionX: 50,
      imagePositionY: 50,
      imageScale: 100,
      imageHeight: 220,
      imageOpacity: 100,
      imageBrightness: 100,
      imageOverlay: 28,
    },
    settings: {
      successTitle: '응답이 접수되었습니다',
      successMessage: '참여해 주셔서 감사합니다.',
      submitLabel: '제출하기',
      coverKicker: 'WELCOME',
      startStatusLabel: '시작',
      completeStatusLabel: '완료',
      startLabel: '시작하기',
      pageLabel: 'PAGE',
      requiredLabel: '필수',
      previousLabel: '이전',
      nextLabel: '다음',
      submitPendingLabel: '저장 중',
      restartLabel: '처음부터 보기',
      answerPlaceholder: '답변을 입력해 주세요',
      selectPlaceholder: '선택해 주세요',
      consentLabel: '내용을 확인했으며 동의합니다.',
      shareTitle: null,
      shareDescription: null,
      shareImageMode: 'cover',
    },
    status: 'draft',
    folder: '',
    memo: '',
    memoColor: 'lemon',
    responseLockEnabled: false,
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

export function formSteps(project) {
  return (project?.pages || []).flatMap((page, pageIndex) => (page.fields || []).map((field) => ({ field, page, pageIndex })))
}

export function responseRows(project, responses) {
  const fields = allFields(project)
  return [
    ['제출 시각', 'DB 판정', '판정 사유', ...fields.map((field) => field.label)],
    ...responses.map((response) => [
      new Date(response.submittedAt).toLocaleString('ko-KR'),
      response.qualityStatus === 'duplicate' ? '중복 DB' : response.qualityStatus === 'invalid' ? '불량 DB' : '정상',
      Array.isArray(response.qualityReasons) ? response.qualityReasons.join(' · ') : '',
      ...fields.map((field) => {
        const value = response.answers[field.id]
        return Array.isArray(value) ? value.join(', ') : value ?? ''
      }),
    ]),
  ]
}
