import { FONT_STACKS, resolveDirectTextStyle } from './maker'
import { normalizeSlug } from './validation'

export const SITE_BLOCKS = [
  { type: 'hero', label: '첫 화면', description: '제목, 설명, 신청 버튼과 이미지', category: '시작' },
  { type: 'ticker', label: '알림 띠', description: '짧은 문장을 리듬 있게 보여줘요', category: '강조' },
  { type: 'benefits', label: '핵심 안내', description: '중요한 장점을 비대칭으로 정리해요', category: '정보' },
  { type: 'story', label: '이미지와 글', description: '이미지와 긴 설명을 함께 배치해요', category: '정보' },
  { type: 'cards', label: '콘텐츠 카드', description: '여러 내용을 다양한 크기로 구성해요', category: '정보' },
  { type: 'stats', label: '핵심 수치', description: '숫자나 키워드를 크게 강조해요', category: '강조' },
  { type: 'steps', label: '진행 과정', description: '신청 과정을 순서대로 안내해요', category: '정보' },
  { type: 'quote', label: '후기와 인용', description: '한 문장을 크게 집중해서 보여줘요', category: '신뢰' },
  { type: 'faq', label: '자주 묻는 질문', description: '질문과 답변을 접어서 정리해요', category: '신뢰' },
  { type: 'form', label: '신청 폼', description: '기존 폼을 응답 시스템과 연결해요', category: '신청' },
  { type: 'cta', label: '신청 유도', description: '신청 폼으로 이동하는 마지막 문구', category: '신청' },
  { type: 'notice', label: '안내사항', description: '주의사항과 책임 고지를 표시해요', category: '신뢰' },
  { type: 'divider', label: '구분선', description: '섹션 사이의 호흡을 조절해요', category: '구조' },
]

export const MAX_SITE_SECTIONS = 30

export const SITE_COLLECTION_RULES = {
  ticker: { min: 1, max: 8, label: '알림 문구', create: () => '새 알림 문구' },
  benefits: { min: 1, max: 4, label: '핵심 안내', create: () => ({ title: '새 핵심 안내', description: '내용을 입력하세요.' }) },
  cards: { min: 1, max: 6, label: '콘텐츠 카드', create: () => ({ title: '새 카드', description: '내용을 입력하세요.' }) },
  stats: { min: 1, max: 4, label: '핵심 수치', create: () => ({ value: '새 값', label: '설명을 입력하세요' }) },
  steps: { min: 1, max: 5, label: '진행 과정', create: () => ({ title: '새 과정', description: '내용을 입력하세요.' }) },
  faq: { min: 1, max: 8, label: '질문과 답변', create: () => ({ question: '새 질문', answer: '답변을 입력하세요.' }) },
}

export function addSiteCollectionItem(section) {
  const rule = SITE_COLLECTION_RULES[section?.type]
  const items = section?.data?.items
  if (!rule || !Array.isArray(items) || items.length >= rule.max) return section
  return { ...section, data: { ...section.data, items: [...items, rule.create()] } }
}

export function removeSiteCollectionItem(section, index) {
  const rule = SITE_COLLECTION_RULES[section?.type]
  const items = section?.data?.items
  if (!rule || !Array.isArray(items) || items.length <= rule.min || index < 0 || index >= items.length) return section
  return { ...section, data: { ...section.data, items: items.filter((_, itemIndex) => itemIndex !== index) } }
}

export function applySiteComposition(site, presetId) {
  const preset = SITE_COMPOSITION_PRESETS.find((item) => item.id === presetId)
  if (!preset) return site
  const theme = SITE_THEME_PRESETS.find((item) => item.id === preset.themeId)?.theme
  return {
    ...site,
    theme: theme ? { ...theme } : site.theme,
    content: {
      ...site.content,
      sections: (site.content?.sections || []).map((section) => ({
        ...section,
        style: { ...section.style, ...(preset.styles[section.type] || {}) },
        data: { ...section.data, ...(preset.data?.[section.type] || {}) },
      })),
    },
  }
}

export const SITE_THEME_PRESETS = [
  {
    id: 'midnight-cobalt',
    name: '미드나이트 시그널',
    description: '깊은 네이비와 전기 블루',
    theme: { mode: 'dark', accent: '#2f7cf4', background: '#050b14', surface: '#0d1826', text: '#f4f7fb', muted: '#9aabc0', line: '#26384f', radius: 14, font: 'pretendard', displayScale: 1.02, bodyScale: .96, sectionScale: 1 },
  },
  {
    id: 'signal',
    name: '시그널 다크',
    description: '차분한 차콜과 민트',
    theme: { mode: 'dark', accent: '#55d98b', background: '#0d1219', surface: '#151c25', text: '#f2f6f4', muted: '#a3afa9', line: '#2c3641', radius: 18, font: 'pretendard', displayScale: 1, bodyScale: 1, sectionScale: 1 },
  },
  {
    id: 'chrome',
    name: '크롬 스튜디오',
    description: '은빛 표면과 전기 파랑',
    theme: { mode: 'light', accent: '#2359d1', background: '#edf0f4', surface: '#fbfcfd', text: '#171b22', muted: '#667080', line: '#cfd5dd', radius: 14, font: 'pretendard', displayScale: 1, bodyScale: 1, sectionScale: 1 },
  },
  {
    id: 'ink',
    name: '잉크 오렌지',
    description: '묵직한 검정과 번트 오렌지',
    theme: { mode: 'dark', accent: '#e47442', background: '#111315', surface: '#1a1d20', text: '#f4f1ec', muted: '#aaa49d', line: '#34373a', radius: 8, font: 'pretendard', displayScale: 1.05, bodyScale: 1, sectionScale: 1 },
  },
  {
    id: 'forest',
    name: '딥 포레스트',
    description: '깊은 녹색과 앰버',
    theme: { mode: 'dark', accent: '#e2a94f', background: '#10221d', surface: '#18302a', text: '#eef5ef', muted: '#a9bbb1', line: '#315048', radius: 20, font: 'gowun', displayScale: 1, bodyScale: 1.02, sectionScale: 1.05 },
  },
  {
    id: 'cobalt',
    name: '코발트 라이트',
    description: '밝고 선명한 정보형',
    theme: { mode: 'light', accent: '#2458d3', background: '#eef3f8', surface: '#ffffff', text: '#182231', muted: '#657184', line: '#d4dce6', radius: 16, font: 'pretendard', displayScale: 1, bodyScale: 1, sectionScale: 1 },
  },
  {
    id: 'rose',
    name: '로즈 그래픽',
    description: '쿨 그레이와 딥 로즈',
    theme: { mode: 'light', accent: '#b43f68', background: '#f1f2f5', surface: '#fbfbfc', text: '#242128', muted: '#706a76', line: '#d9d6dc', radius: 22, font: 'noto-sans', displayScale: 1.02, bodyScale: 1, sectionScale: 1 },
  },
  {
    id: 'mono',
    name: '모노 포스터',
    description: '강한 흑백 대비',
    theme: { mode: 'light', accent: '#22262d', background: '#f3f3f1', surface: '#fcfcfa', text: '#17191d', muted: '#686b70', line: '#cdceca', radius: 2, font: 'black-han', displayScale: 1.06, bodyScale: .98, sectionScale: .95 },
  },
  {
    id: 'coral',
    name: '코랄 에디토리얼',
    description: '부드러운 회색과 코랄',
    theme: { mode: 'light', accent: '#c95445', background: '#efefec', surface: '#fafaf7', text: '#292a2c', muted: '#717276', line: '#d5d5d0', radius: 12, font: 'gowun', displayScale: 1, bodyScale: 1.04, sectionScale: 1.02 },
  },
  {
    id: 'violet-ink',
    name: '바이올렛 잉크',
    description: '먹색 바탕과 선명한 보라',
    theme: { mode: 'dark', accent: '#9a7ee8', background: '#121118', surface: '#1d1b25', text: '#f4f1f8', muted: '#aaa4b4', line: '#383442', radius: 16, font: 'pretendard', displayScale: 1.06, bodyScale: 1, sectionScale: 1.03 },
  },
  {
    id: 'ice',
    name: '아이스 블루',
    description: '차가운 흰색과 블루 포인트',
    theme: { mode: 'light', accent: '#2b63c7', background: '#e9eef5', surface: '#f8fafc', text: '#17202c', muted: '#657285', line: '#cad4e1', radius: 20, font: 'noto-sans', displayScale: 1, bodyScale: 1, sectionScale: 1.04 },
  },
  {
    id: 'lime-black',
    name: '라임 블랙',
    description: '검정 포스터와 라임 포인트',
    theme: { mode: 'dark', accent: '#b4d84c', background: '#111312', surface: '#1a1d1b', text: '#f1f4ed', muted: '#a4aba0', line: '#343a35', radius: 4, font: 'black-han', displayScale: 1.08, bodyScale: 1, sectionScale: .96 },
  },
  {
    id: 'sky-paper',
    name: '스카이 페이퍼',
    description: '맑은 하늘색과 종이 질감',
    theme: { mode: 'light', accent: '#356db5', background: '#e8f0f5', surface: '#f7fafb', text: '#1d2b35', muted: '#687985', line: '#cad8df', radius: 10, font: 'gowun', displayScale: 1.02, bodyScale: 1.04, sectionScale: 1.08 },
  },
]

export const SECTION_STYLE_OPTIONS = {
  tone: [['inherit', '기본'], ['surface', '표면'], ['accent', '강조'], ['soft', '옅은 강조']],
  spacing: [['compact', '좁게'], ['normal', '보통'], ['air', '넓게']],
  width: [['wide', '넓게'], ['normal', '보통'], ['narrow', '좁게']],
  align: [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']],
  pattern: [['none', '없음'], ['grid', '그리드'], ['dots', '도트'], ['glow', '빛 번짐'], ['grain', '필름 결'], ['mesh', '메시'], ['stripes', '사선'], ['paper', '종이'], ['waves', '물결']],
  elevation: [['flat', '평면'], ['soft', '부드럽게'], ['float', '띄우기']],
  motion: [['none', '없음'], ['fade', '페이드'], ['rise', '떠오르기'], ['scale', '확대']],
}

export const SITE_LAYOUT_OPTIONS = {
  hero: [['split', '분할'], ['cinematic', '시네마틱'], ['poster', '포스터'], ['minimal', '미니멀']],
  ticker: [['marquee', '흐르기'], ['static', '고정']],
  benefits: [['bento', '벤토'], ['rail', '가로 카드'], ['list', '목록']],
  story: [['split', '분할'], ['overlap', '겹치기'], ['editorial', '에디토리얼']],
  cards: [['mosaic', '모자이크'], ['rail', '가로 카드'], ['stack', '세로 카드']],
  stats: [['row', '가로 수치'], ['tiles', '타일'], ['ledger', '장부']],
  steps: [['timeline', '타임라인'], ['cards', '카드'], ['compact', '간결하게']],
  quote: [['center', '가운데'], ['edge', '한쪽 강조']],
  faq: [['columns', '두 칸'], ['stack', '한 칸']],
  form: [['panel', '패널'], ['plain', '여백형']],
  cta: [['banner', '배너'], ['poster', '포스터']],
  notice: [['inline', '한 줄'], ['panel', '패널']],
  divider: [['line', '선'], ['label', '라벨']],
}

export const SITE_COMPOSITION_PRESETS = [
  { id: 'cinematic-finance', name: '시네마틱 금융', description: '배경과 신청 폼이 한 화면에 겹치는 구성', themeId: 'midnight-cobalt', preview: 'cinematic', styles: { hero: { layout: 'cinematic', pattern: 'grain', spacing: 'air' }, form: { layout: 'panel', tone: 'surface', elevation: 'float', spacing: 'compact' }, benefits: { layout: 'list' }, stats: { layout: 'ledger' }, steps: { layout: 'compact' }, notice: { layout: 'panel' } }, data: { hero: { overlayStrength: 76, imageFocus: 52 }, form: { questionSize: 14, descriptionSize: 11, inputSize: 12, inputHeight: 42, fieldSpacing: 7 } } },
  { id: 'editorial', name: '에디토리얼', description: '큰 제목과 겹치는 이미지', themeId: 'coral', preview: 'editorial', styles: { hero: { layout: 'poster', pattern: 'paper' }, benefits: { layout: 'list' }, story: { layout: 'overlap' }, cards: { layout: 'rail' }, stats: { layout: 'ledger' }, quote: { layout: 'edge' } } },
  { id: 'creator', name: '크리에이터', description: '밝은 표면과 부드러운 카드', themeId: 'ice', preview: 'creator', styles: { hero: { layout: 'split', pattern: 'mesh' }, benefits: { layout: 'bento' }, story: { layout: 'split', elevation: 'float' }, cards: { layout: 'mosaic' }, steps: { layout: 'cards' } } },
  { id: 'poster', name: '그래픽 포스터', description: '강한 대비와 굵은 타이포', themeId: 'lime-black', preview: 'poster', styles: { hero: { layout: 'poster', pattern: 'stripes' }, benefits: { layout: 'rail' }, story: { layout: 'editorial' }, cards: { layout: 'stack' }, stats: { layout: 'tiles' }, cta: { layout: 'poster' } } },
  { id: 'finance', name: '파이낸스', description: '수치와 기준이 빠르게 보이는 구성', themeId: 'signal', preview: 'finance', styles: { hero: { layout: 'minimal', pattern: 'grid' }, ticker: { layout: 'static' }, benefits: { layout: 'list' }, stats: { layout: 'ledger', tone: 'surface' }, steps: { layout: 'compact' }, notice: { layout: 'panel' } } },
  { id: 'launch', name: '런칭 페이지', description: '핵심 문장과 신청에 집중', themeId: 'violet-ink', preview: 'launch', styles: { hero: { layout: 'poster', pattern: 'glow' }, benefits: { layout: 'bento' }, cards: { layout: 'rail' }, quote: { layout: 'center' }, form: { layout: 'panel', elevation: 'float' }, cta: { layout: 'poster' } } },
  { id: 'calm', name: '차분한 안내', description: '긴 글도 편안하게 읽히는 구성', themeId: 'sky-paper', preview: 'calm', styles: { hero: { layout: 'minimal', pattern: 'waves' }, benefits: { layout: 'list' }, story: { layout: 'editorial' }, cards: { layout: 'stack' }, faq: { layout: 'stack' }, form: { layout: 'plain' } } },
]

const defaultSectionStyle = {
  tone: 'inherit',
  spacing: 'normal',
  width: 'wide',
  align: 'left',
  pattern: 'none',
  elevation: 'flat',
  motion: 'rise',
  layout: '',
}

const blockDefaults = {
  hero: {
    eyebrow: '실시간 대응 알림',
    title: '변화가 올 때, 바로 대응하세요',
    description: '핵심 변화와 확인할 기준을 정리해 빠르게 알려드립니다.',
    buttonLabel: '알림 신청하기',
    imageUrl: '',
    imageAlt: '서비스를 소개하는 대표 이미지',
    imageMode: 'frame',
    overlayStrength: 72,
    imageFocus: 50,
    imagePositionY: 50,
    imageScale: 100,
    imageRatio: 'portrait',
    align: 'left',
  },
  ticker: {
    items: ['핵심 변화 확인', '대응 기준 정리', '신청 즉시 접수'],
  },
  benefits: {
    title: '필요한 정보만 간결하게',
    description: '처음 방문한 사람도 서비스와 신청 이유를 바로 이해할 수 있습니다.',
    items: [
      { title: '핵심 변화 확인', description: '중요한 변화를 놓치지 않도록 정리합니다.' },
      { title: '대응 기준 안내', description: '확인해야 할 가격과 상황을 함께 전달합니다.' },
      { title: '빠른 신청', description: '복잡한 가입 없이 필요한 내용만 입력합니다.' },
    ],
  },
  story: {
    title: '정보보다 중요한 것은 대응 기준입니다',
    description: '단순한 소식 전달이 아니라 어떤 상황을 확인해야 하는지 이해하기 쉽게 안내합니다.',
    imageUrl: '',
    imageAlt: '상세 내용을 설명하는 이미지',
    imageMode: 'frame',
    overlayStrength: 58,
    imagePosition: 'right',
    imageFocus: 50,
    imagePositionY: 50,
    imageScale: 100,
    imageRatio: 'landscape',
  },
  cards: {
    title: '한눈에 확인하는 핵심 내용',
    description: '복잡한 내용을 짧은 단위로 나누어 보여줍니다.',
    items: [
      { title: '무엇을 알려주나요', description: '변화가 생긴 이유와 지금 확인할 내용을 정리합니다.' },
      { title: '언제 연락받나요', description: '정해둔 조건이 충족되면 빠르게 안내합니다.' },
      { title: '어떻게 신청하나요', description: '아래 폼에 필요한 정보만 남기면 접수됩니다.' },
      { title: '개인정보는 안전한가요', description: '신청과 안내 목적에 필요한 정보만 사용합니다.' },
    ],
  },
  stats: {
    title: '신청 전에 이것만 확인하세요',
    items: [
      { value: '핵심만', label: '불필요한 내용 없이' },
      { value: '빠르게', label: '변화가 생긴 시점에' },
      { value: '한곳에', label: '신청과 응답을 연결' },
    ],
  },
  steps: {
    title: '신청은 간단합니다',
    description: '필요한 내용을 남기면 확인 후 안내를 시작합니다.',
    items: [
      { title: '정보 입력', description: '아래 신청 폼에 필요한 내용을 남깁니다.' },
      { title: '접수 확인', description: '관리자가 신청 내용을 확인합니다.' },
      { title: '안내 시작', description: '조건에 맞는 변화가 생기면 연락드립니다.' },
    ],
  },
  quote: {
    quote: '확인할 기준이 분명하면 변화가 와도 당황하지 않습니다.',
    name: '대응 알림 운영 원칙',
    role: '신청자 안내 기준',
  },
  faq: {
    title: '자주 묻는 질문',
    items: [
      { question: '신청하면 바로 연락이 오나요?', answer: '신청 내용을 확인한 뒤 안내가 필요한 시점에 연락드립니다.' },
      { question: '신청 내용을 수정할 수 있나요?', answer: '운영자에게 다시 알려주시면 확인 후 반영합니다.' },
      { question: '어떤 정보가 필요한가요?', answer: '안내에 필요한 최소한의 정보만 받습니다.' },
    ],
  },
  form: {
    title: '대응 알림 신청',
    description: '아래 항목을 입력하면 기존 응답 관리자와 백업 흐름으로 바로 연결됩니다.',
    emptyMessage: '오른쪽 설정에서 연결할 폼을 선택해 주세요.',
    questionSize: 20,
    descriptionSize: 13,
    inputSize: 15,
    inputHeight: 48,
    fieldSpacing: 16,
    fieldOrder: [],
    fieldStyles: {},
  },
  cta: {
    title: '지금 필요한 안내를 신청하세요',
    description: '신청 내용을 확인한 뒤 필요한 시점에 연락드립니다.',
    buttonLabel: '신청 폼으로 이동',
  },
  notice: {
    title: '신청 전 확인해 주세요',
    description: '제공되는 내용은 참고용이며 특정 결과를 보장하지 않습니다. 최종 판단과 책임은 신청자 본인에게 있습니다.',
  },
  divider: {
    label: '다음 내용',
  },
}

function id() {
  return crypto.randomUUID()
}

function initialSectionStyle(type) {
  const style = { ...defaultSectionStyle }
  if (type === 'hero') Object.assign(style, { spacing: 'air', pattern: 'grid' })
  if (type === 'ticker') Object.assign(style, { spacing: 'compact', tone: 'accent', width: 'wide' })
  if (type === 'quote') Object.assign(style, { tone: 'soft', width: 'normal', align: 'center' })
  if (type === 'form') Object.assign(style, { tone: 'surface', width: 'normal' })
  if (type === 'cta') Object.assign(style, { tone: 'accent', width: 'normal', align: 'center' })
  if (type === 'notice' || type === 'divider') Object.assign(style, { spacing: 'compact', width: 'normal' })
  style.layout = SITE_LAYOUT_OPTIONS[type]?.[0]?.[0] || ''
  return style
}

export function makeSiteSection(type) {
  const safeType = SITE_BLOCKS.some((block) => block.type === type) ? type : 'story'
  return { id: id(), type: safeType, enabled: true, style: initialSectionStyle(safeType), textStyles: {}, data: structuredClone(blockDefaults[safeType]) }
}

export const SITE_TEMPLATES = [
  {
    id: 'market-signal',
    name: '금융 대응 알림',
    category: '금융',
    description: '수치와 대응 기준을 빠르게 전달하는 다크 시그널형',
    preview: 'market',
    themeId: 'midnight-cobalt',
    brandName: 'MARKET SIGNAL',
    settings: { footerText: '제공되는 내용은 참고용이며 최종 판단과 책임은 신청자 본인에게 있습니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'cinematic', pattern: 'grain', spacing: 'air' }, data: { eyebrow: '실시간 대응 알림', title: '변화가 보일 때, 대응은 빨라야 합니다', description: '핵심 변화와 확인할 기준을 정리해 필요한 시점에 알려드립니다.', buttonLabel: '알림 신청하기', overlayStrength: 78, imageMode: 'background' } },
      { type: 'ticker', style: { layout: 'marquee' }, data: { items: ['시장 변화 확인', '핵심 기준 정리', '신청자별 안내'] } },
      { type: 'stats', style: { layout: 'ledger', tone: 'surface', spacing: 'compact' }, data: { title: '복잡한 시장을 세 가지 기준으로', items: [{ value: '빠르게', label: '변화를 확인하고' }, { value: '명확하게', label: '대응 기준을 정리해' }, { value: '한곳에', label: '신청과 안내를 연결' }] } },
      { type: 'benefits', style: { layout: 'list' }, data: { title: '확인해야 할 내용만 남겼습니다', description: '처음 보는 사람도 신청 이유를 바로 이해할 수 있습니다.', items: [{ title: '변화의 이유', description: '무엇이 달라졌는지 짧고 명확하게 정리합니다.' }, { title: '확인할 기준', description: '지금 봐야 할 가격과 상황을 함께 안내합니다.' }, { title: '빠른 연락', description: '조건에 맞는 변화가 생기면 신청자에게 전달합니다.' }] } },
      { type: 'steps', style: { layout: 'compact', tone: 'soft' }, data: { title: '신청부터 안내까지', description: '필요한 정보만 남기면 확인 후 안내를 시작합니다.', items: [{ title: '정보 남기기', description: '이름과 연락처 등 필요한 내용을 입력합니다.' }, { title: '신청 확인', description: '운영자가 접수 내용을 확인합니다.' }, { title: '대응 알림 받기', description: '안내가 필요한 시점에 연락드립니다.' }] } },
      { type: 'form', style: { layout: 'panel', tone: 'surface', elevation: 'float', spacing: 'compact' }, data: { title: '대응 알림 신청', description: '필요한 정보를 입력하면 바로 접수됩니다.', questionSize: 15, descriptionSize: 11, inputSize: 13, inputHeight: 44, fieldSpacing: 9 } },
      { type: 'notice', style: { layout: 'panel', spacing: 'compact' }, data: { title: '신청 전 확인', description: '제공되는 내용은 참고용이며 특정 결과를 보장하지 않습니다. 최종 판단과 책임은 신청자 본인에게 있습니다.' } },
    ],
  },
  {
    id: 'reservation-studio',
    name: '예약·상담 스튜디오',
    category: '예약',
    description: '서비스 분위기와 상담 흐름을 차분하게 보여주는 예약형',
    preview: 'reservation',
    themeId: 'chrome',
    brandName: 'STUDIO RESERVE',
    settings: { footerText: '예약 내용은 일정 확인과 상담 안내 목적으로만 사용됩니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'split', pattern: 'mesh', spacing: 'air' }, data: { eyebrow: 'PRIVATE RESERVATION', title: '당신에게 맞는 시간을 예약하세요', description: '서비스를 확인하고 원하는 일정과 상담 내용을 한 번에 남길 수 있습니다.', buttonLabel: '상담 예약하기', imageRatio: 'portrait' } },
      { type: 'story', style: { layout: 'overlap', tone: 'surface', elevation: 'soft' }, data: { title: '충분히 듣고 정확하게 제안합니다', description: '상담 전 필요한 내용을 미리 확인해 방문하거나 통화하는 시간을 더 편안하게 만듭니다.', imageRatio: 'landscape' } },
      { type: 'benefits', style: { layout: 'bento' }, data: { title: '예약 전에 확인할 수 있어요', description: '서비스 선택부터 일정 조율까지 한 페이지에서 이어집니다.', items: [{ title: '서비스 안내', description: '가능한 서비스와 특징을 먼저 확인합니다.' }, { title: '일정 요청', description: '희망 날짜와 시간을 편하게 남깁니다.' }, { title: '맞춤 상담', description: '남긴 내용을 바탕으로 상담을 준비합니다.' }] } },
      { type: 'quote', style: { layout: 'edge', tone: 'soft', align: 'left' }, data: { quote: '좋은 상담은 충분히 듣는 것에서 시작합니다.', name: '예약 운영 원칙', role: '상담 안내 기준' } },
      { type: 'steps', style: { layout: 'timeline' }, data: { title: '예약은 이렇게 진행됩니다', description: '신청 후 담당자가 가능 일정을 확인해 연락드립니다.', items: [{ title: '내용 작성', description: '원하는 서비스와 일정을 남깁니다.' }, { title: '일정 확인', description: '담당자가 가능 여부를 확인합니다.' }, { title: '예약 확정', description: '최종 일정을 안내받으면 예약이 완료됩니다.' }] } },
      { type: 'form', style: { layout: 'plain', tone: 'surface' }, data: { title: '상담 예약', description: '원하는 서비스와 일정을 알려주세요.', questionSize: 18, inputHeight: 50, fieldSpacing: 14 } },
      { type: 'faq', style: { layout: 'columns', width: 'normal' }, data: { title: '예약 전 자주 묻는 질문', items: [{ question: '일정은 언제 확정되나요?', answer: '신청 내용을 확인한 뒤 가능한 일정을 개별 안내합니다.' }, { question: '예약 내용을 바꿀 수 있나요?', answer: '확정 전 담당자에게 알려주시면 조정할 수 있습니다.' }, { question: '상담 비용이 있나요?', answer: '서비스별 비용이 다를 수 있어 상담 전에 안내합니다.' }] } },
      { type: 'notice', style: { layout: 'inline', spacing: 'compact' }, data: { title: '예약 안내', description: '신청만으로 예약이 확정되지는 않습니다. 담당자의 최종 안내를 확인해 주세요.' } },
    ],
  },
  {
    id: 'property-consult',
    name: '부동산 상담',
    category: '상담',
    description: '핵심 조건과 상담 절차를 신뢰감 있게 정리한 안내형',
    preview: 'property',
    themeId: 'forest',
    brandName: 'GROUND GUIDE',
    settings: { footerText: '상담 내용은 문의 확인과 관련 안내를 위해서만 사용됩니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'minimal', pattern: 'paper', spacing: 'air' }, data: { eyebrow: '맞춤 상담 안내', title: '조건을 먼저 확인하면 선택이 선명해집니다', description: '희망 지역과 예산, 목적을 남기면 상담에 필요한 내용을 정리해 드립니다.', buttonLabel: '상담 신청하기' } },
      { type: 'stats', style: { layout: 'tiles', tone: 'surface' }, data: { title: '상담에서 먼저 확인하는 기준', items: [{ value: '지역', label: '생활권과 이동 조건' }, { value: '예산', label: '가능한 범위와 계획' }, { value: '목적', label: '거주 또는 투자 방향' }] } },
      { type: 'benefits', style: { layout: 'rail' }, data: { title: '복잡한 조건을 순서대로 정리합니다', description: '상담 전에 필요한 판단 기준을 짧게 확인할 수 있습니다.', items: [{ title: '희망 조건 정리', description: '지역, 면적, 예산 등 우선순위를 확인합니다.' }, { title: '가능 범위 안내', description: '현재 조건에서 확인할 수 있는 범위를 설명합니다.' }, { title: '다음 단계 제안', description: '추가 확인이나 방문이 필요한지 안내합니다.' }] } },
      { type: 'steps', style: { layout: 'cards', tone: 'soft' }, data: { title: '상담 진행 과정', description: '문의 내용을 확인한 뒤 순서대로 연락드립니다.', items: [{ title: '조건 입력', description: '원하는 지역과 예산을 남깁니다.' }, { title: '내용 검토', description: '상담에 필요한 정보를 정리합니다.' }, { title: '개별 상담', description: '확인된 내용을 바탕으로 안내합니다.' }] } },
      { type: 'form', style: { layout: 'panel', tone: 'surface', elevation: 'soft' }, data: { title: '맞춤 상담 신청', description: '희망 조건을 남기면 확인 후 연락드립니다.', questionSize: 17, inputHeight: 48, fieldSpacing: 12 } },
      { type: 'notice', style: { layout: 'panel', spacing: 'compact' }, data: { title: '상담 전 확인', description: '제공되는 정보는 일반적인 안내이며 계약이나 수익을 보장하지 않습니다. 최종 결정 전 관련 서류와 조건을 직접 확인해 주세요.' } },
    ],
  },
  {
    id: 'event-launch',
    name: '이벤트 사전 신청',
    category: '이벤트',
    description: '한 문장과 참가 혜택을 강하게 보여주는 포스터형',
    preview: 'event',
    themeId: 'lime-black',
    brandName: 'OPEN SESSION',
    settings: { footerText: '행사 일정과 운영 내용은 상황에 따라 변경될 수 있습니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'poster', pattern: 'stripes', spacing: 'air' }, data: { eyebrow: '사전 참가 신청', title: '지금 신청하고 현장에서 만나세요', description: '행사 핵심 내용과 참가 방법을 확인하고 빠르게 신청할 수 있습니다.', buttonLabel: '참가 신청하기' } },
      { type: 'ticker', style: { layout: 'marquee' }, data: { items: ['사전 신청 접수', '현장 프로그램 안내', '참가자 개별 연락'] } },
      { type: 'cards', style: { layout: 'mosaic' }, data: { title: '이 행사에서 만나는 것', description: '긴 설명보다 참가자가 실제로 경험할 내용을 먼저 보여줍니다.', items: [{ title: '핵심 세션', description: '주제에 필요한 내용을 집중해서 다룹니다.' }, { title: '현장 질문', description: '궁금한 내용을 직접 묻고 답을 들을 수 있습니다.' }, { title: '참가 자료', description: '행사 후 다시 볼 수 있는 안내를 제공합니다.' }, { title: '후속 안내', description: '원하는 사람에게 다음 소식을 전달합니다.' }] } },
      { type: 'stats', style: { layout: 'row', tone: 'soft' }, data: { title: '참가 전에 확인하세요', items: [{ value: '일정', label: '행사 날짜와 시간' }, { value: '장소', label: '참가 방식과 위치' }, { value: '준비', label: '필요한 사전 안내' }] } },
      { type: 'form', style: { layout: 'panel', tone: 'surface', elevation: 'float', spacing: 'compact' }, data: { title: '사전 참가 신청', description: '참가자 정보를 남기면 확인 안내를 보내드립니다.', questionSize: 16, inputHeight: 46, fieldSpacing: 10 } },
      { type: 'notice', style: { layout: 'inline', spacing: 'compact' }, data: { title: '행사 안내', description: '신청 인원과 운영 상황에 따라 일정 또는 프로그램이 조정될 수 있습니다.' } },
    ],
  },
  {
    id: 'clinic-appointment',
    name: '클리닉 예약',
    category: '예약',
    description: '과장 없이 과정과 상담 기준을 편안하게 보여주는 클린형',
    preview: 'clinic',
    themeId: 'ice',
    brandName: 'CLEAR APPOINTMENT',
    settings: { footerText: '작성한 내용은 예약 확인과 상담 안내 목적으로만 사용됩니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'split', pattern: 'waves', spacing: 'air' }, data: { eyebrow: '편안한 상담 예약', title: '충분히 확인하고 나에게 맞게 선택하세요', description: '필요한 상담 내용을 먼저 남기면 방문 전 확인할 사항을 안내합니다.', buttonLabel: '예약 상담하기', imageRatio: 'portrait' } },
      { type: 'benefits', style: { layout: 'list' }, data: { title: '상담에서 중요하게 보는 것', description: '과장된 표현보다 과정과 주의사항을 분명하게 안내합니다.', items: [{ title: '현재 상태 확인', description: '불편한 점과 원하는 방향을 먼저 듣습니다.' }, { title: '과정 안내', description: '가능한 방법과 진행 순서를 설명합니다.' }, { title: '주의사항 확인', description: '결정 전에 알아야 할 내용을 함께 안내합니다.' }] } },
      { type: 'story', style: { layout: 'editorial', tone: 'surface' }, data: { title: '결정보다 먼저 충분한 설명이 필요합니다', description: '상담 과정에서 궁금한 점을 확인하고, 본인에게 맞는 선택인지 천천히 판단할 수 있도록 돕습니다.', imageRatio: 'landscape' } },
      { type: 'quote', style: { layout: 'center', tone: 'soft' }, data: { quote: '충분히 이해한 뒤 선택할 수 있도록 안내합니다.', name: '상담 운영 기준', role: '예약 안내 원칙' } },
      { type: 'form', style: { layout: 'plain', tone: 'surface' }, data: { title: '상담 예약', description: '원하는 일정과 상담 내용을 남겨주세요.', questionSize: 17, inputHeight: 50, fieldSpacing: 14 } },
      { type: 'faq', style: { layout: 'stack', width: 'normal' }, data: { title: '상담 전 자주 묻는 질문', items: [{ question: '신청하면 바로 예약되나요?', answer: '가능한 일정을 확인한 뒤 개별 연락으로 예약을 확정합니다.' }, { question: '상담 전에 준비할 것이 있나요?', answer: '필요한 내용이 있다면 예약 확정 안내에서 함께 알려드립니다.' }, { question: '작성한 정보는 어디에 쓰이나요?', answer: '예약 확인과 상담 안내에 필요한 범위에서만 사용합니다.' }] } },
      { type: 'notice', style: { layout: 'panel', spacing: 'compact' }, data: { title: '예약 전 확인', description: '상담 결과와 진행 가능 여부는 개인 상황에 따라 달라질 수 있습니다. 자세한 내용은 상담 과정에서 확인해 주세요.' } },
    ],
  },
  {
    id: 'creator-class',
    name: '강의·자료 신청',
    category: '콘텐츠',
    description: '강의 가치와 제공 자료를 보기 좋게 나누는 콘텐츠형',
    preview: 'creator',
    themeId: 'cobalt',
    brandName: 'PRACTICE CLASS',
    settings: { footerText: '강의와 자료의 저작권은 제작자에게 있으며 무단 배포를 금합니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'poster', pattern: 'grid', spacing: 'air' }, data: { eyebrow: '실전 강의와 자료', title: '배운 내용을 바로 써먹을 수 있게', description: '핵심 개념과 실제 활용 방법을 한 번에 익히는 신청 페이지입니다.', buttonLabel: '강의 신청하기' } },
      { type: 'benefits', style: { layout: 'bento' }, data: { title: '이 강의에서 가져가는 것', description: '강의가 끝난 뒤에도 다시 사용할 수 있는 기준과 자료를 제공합니다.', items: [{ title: '핵심 개념', description: '꼭 알아야 할 내용을 짧고 정확하게 설명합니다.' }, { title: '실전 예시', description: '실제 상황에 적용하는 방법을 보여줍니다.' }, { title: '복습 자료', description: '강의 후 다시 확인할 수 있는 자료를 제공합니다.' }] } },
      { type: 'cards', style: { layout: 'rail', tone: 'soft' }, data: { title: '이런 분에게 잘 맞습니다', description: '현재 필요한 내용과 맞는지 먼저 확인해 보세요.', items: [{ title: '처음 시작하는 분', description: '기초부터 순서대로 배우고 싶은 분' }, { title: '정리가 필요한 분', description: '알고 있는 내용을 실전 기준으로 묶고 싶은 분' }, { title: '바로 적용할 분', description: '업무나 프로젝트에 곧바로 활용할 분' }] } },
      { type: 'quote', style: { layout: 'edge', tone: 'surface', align: 'left' }, data: { quote: '좋은 강의는 듣는 시간보다 써먹는 시간을 늘려줍니다.', name: '강의 제작 원칙', role: '실전 활용 중심' } },
      { type: 'faq', style: { layout: 'columns' }, data: { title: '신청 전 확인해 주세요', items: [{ question: '초보자도 들을 수 있나요?', answer: '처음 접하는 분도 따라올 수 있도록 핵심부터 설명합니다.' }, { question: '자료는 어떻게 받나요?', answer: '신청 확인 후 안내된 방법으로 전달합니다.' }, { question: '신청 내용을 바꿀 수 있나요?', answer: '운영자에게 알려주시면 확인 후 반영합니다.' }] } },
      { type: 'form', style: { layout: 'panel', tone: 'surface', elevation: 'soft' }, data: { title: '강의 신청', description: '참가자 정보와 필요한 내용을 알려주세요.', questionSize: 17, inputHeight: 48, fieldSpacing: 12 } },
      { type: 'notice', style: { layout: 'inline', spacing: 'compact' }, data: { title: '자료 이용 안내', description: '제공되는 강의와 자료는 신청자 본인의 학습 목적으로만 이용해 주세요.' } },
    ],
  },
  {
    id: 'recruit-apply',
    name: '채용 지원',
    category: '채용',
    description: '역할과 지원 과정을 선명하게 설명하는 리크루팅형',
    preview: 'recruit',
    themeId: 'ink',
    brandName: 'JOIN THE TEAM',
    settings: { footerText: '지원 정보는 채용 검토와 결과 안내 목적으로만 사용됩니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'minimal', pattern: 'grain', spacing: 'air' }, data: { eyebrow: '새로운 동료를 찾습니다', title: '잘하는 일을 더 크게 만들 사람', description: '역할과 일하는 방식을 확인하고 간단한 지원 정보를 남겨주세요.', buttonLabel: '지원하기' } },
      { type: 'ticker', style: { layout: 'static' }, data: { items: ['역할 중심 채용', '지원서 간편 접수', '검토 후 개별 안내'] } },
      { type: 'benefits', style: { layout: 'list' }, data: { title: '함께 일할 때 중요하게 보는 것', description: '화려한 표현보다 실제 경험과 일하는 방식을 확인합니다.', items: [{ title: '문제를 이해하는 힘', description: '주어진 상황을 정확히 파악하고 질문합니다.' }, { title: '끝까지 만드는 태도', description: '작은 일도 책임 있게 마무리합니다.' }, { title: '함께 나누는 과정', description: '진행 상황과 생각을 투명하게 공유합니다.' }] } },
      { type: 'steps', style: { layout: 'timeline', tone: 'soft' }, data: { title: '지원 과정', description: '지원서를 확인한 뒤 필요한 과정과 일정을 안내합니다.', items: [{ title: '간단 지원', description: '기본 정보와 경험을 남깁니다.' }, { title: '지원서 검토', description: '역할과 경험이 잘 맞는지 확인합니다.' }, { title: '개별 안내', description: '다음 과정이 필요한 분께 연락드립니다.' }] } },
      { type: 'faq', style: { layout: 'stack', width: 'normal' }, data: { title: '지원 전 자주 묻는 질문', items: [{ question: '정해진 양식이 있나요?', answer: '폼에 안내된 항목에 맞춰 필요한 내용만 작성하면 됩니다.' }, { question: '결과는 언제 알 수 있나요?', answer: '검토가 끝난 뒤 지원자에게 개별 안내합니다.' }, { question: '지원 정보를 수정할 수 있나요?', answer: '운영자에게 알려주시면 확인 후 반영합니다.' }] } },
      { type: 'form', style: { layout: 'plain', tone: 'surface' }, data: { title: '간단 지원', description: '지원자 정보와 경험을 알려주세요.', questionSize: 17, inputHeight: 50, fieldSpacing: 14 } },
      { type: 'notice', style: { layout: 'panel', spacing: 'compact' }, data: { title: '지원 정보 안내', description: '작성한 정보는 채용 검토와 결과 안내에 필요한 범위에서만 사용합니다.' } },
    ],
  },
  {
    id: 'quick-lead',
    name: '초간단 문의',
    category: '상담',
    description: '설명은 짧게, 문의 전환은 빠르게 만든 압축형',
    preview: 'lead',
    themeId: 'rose',
    brandName: 'QUICK CONTACT',
    settings: { footerText: '문의 내용은 상담 확인과 답변을 위해서만 사용됩니다.', stickyCta: true },
    sections: [
      { type: 'hero', style: { layout: 'split', pattern: 'none', spacing: 'normal' }, data: { eyebrow: '빠른 문의 접수', title: '궁금한 내용을 남겨주세요', description: '길게 설명하지 않아도 됩니다. 확인 후 필요한 내용을 다시 안내합니다.', buttonLabel: '문의 남기기', imageRatio: 'square' } },
      { type: 'benefits', style: { layout: 'rail', spacing: 'compact' }, data: { title: '문의가 쉬워지는 세 가지', description: '복잡한 가입 없이 필요한 내용만 입력합니다.', items: [{ title: '간단하게', description: '최소한의 정보만 남깁니다.' }, { title: '정확하게', description: '문의 내용을 확인하고 답변합니다.' }, { title: '빠르게', description: '확인되는 순서대로 연락드립니다.' }] } },
      { type: 'form', style: { layout: 'panel', tone: 'surface', elevation: 'soft', spacing: 'compact' }, data: { title: '문의 남기기', description: '연락받을 정보와 문의 내용을 적어주세요.', questionSize: 16, descriptionSize: 11, inputSize: 13, inputHeight: 44, fieldSpacing: 9 } },
      { type: 'notice', style: { layout: 'inline', spacing: 'compact' }, data: { title: '문의 안내', description: '문의 내용에 따라 답변에 시간이 더 필요할 수 있습니다.' } },
    ],
  },
]

function siteSectionFromTemplate(blueprint, previousForm) {
  const section = makeSiteSection(blueprint.type)
  const data = { ...section.data, ...structuredClone(blueprint.data || {}) }
  if (blueprint.type === 'form' && previousForm) {
    data.fieldOrder = structuredClone(previousForm.data?.fieldOrder || [])
    data.fieldStyles = structuredClone(previousForm.data?.fieldStyles || {})
  }
  return {
    ...section,
    enabled: blueprint.enabled !== false,
    style: { ...section.style, ...(blueprint.style || {}) },
    textStyles: structuredClone(blueprint.textStyles || {}),
    data,
  }
}

export function applySiteTemplate(site, templateId) {
  const template = SITE_TEMPLATES.find((item) => item.id === templateId)
  if (!template) return site
  const theme = SITE_THEME_PRESETS.find((item) => item.id === template.themeId)?.theme
  const previousForm = site.content?.sections?.find((section) => section.type === 'form')
  return {
    ...site,
    content: {
      ...site.content,
      brandName: template.brandName,
      sections: template.sections.map((section) => siteSectionFromTemplate(section, previousForm)),
    },
    theme: theme ? { ...theme } : site.theme,
    settings: { ...site.settings, ...template.settings },
  }
}

export function alignSiteSection(section, align) {
  const nextAlign = ['left', 'center', 'right'].includes(align) ? align : 'left'
  const textStyles = Object.fromEntries(Object.entries(section?.textStyles || {}).map(([label, value]) => {
    if (!value || typeof value !== 'object') return [label, value]
    const { align: _individualAlign, ...inheritedStyle } = value
    if (inheritedStyle.mobile && typeof inheritedStyle.mobile === 'object') {
      const { align: _mobileAlign, ...mobileStyle } = inheritedStyle.mobile
      inheritedStyle.mobile = mobileStyle
    }
    return [label, inheritedStyle]
  }))
  return {
    ...section,
    style: { ...section?.style, align: nextAlign },
    textStyles,
  }
}

export function orderedSiteFormFields(project, fieldOrder = []) {
  const fields = (project?.pages || []).flatMap((page) => page?.fields || [])
  const byId = new Map(fields.map((field) => [field.id, field]))
  const ordered = []
  const seen = new Set()
  ;(Array.isArray(fieldOrder) ? fieldOrder : []).forEach((fieldId) => {
    if (typeof fieldId !== 'string' || seen.has(fieldId) || !byId.has(fieldId)) return
    seen.add(fieldId)
    ordered.push(byId.get(fieldId))
  })
  fields.forEach((field) => {
    if (seen.has(field.id)) return
    seen.add(field.id)
    ordered.push(field)
  })
  return ordered
}

export function emptySite() {
  const preset = SITE_THEME_PRESETS[0]
  const site = {
    title: '새 대응알림 사이트',
    slug: '',
    formProjectId: '',
    content: {
      brandName: 'SIGNAL NOTE',
      sections: ['hero', 'benefits', 'story', 'form', 'notice'].map(makeSiteSection),
    },
    theme: { ...preset.theme },
    settings: {
      footerText: '신청 내용은 안전하게 보관되며 안내 목적에만 사용됩니다.',
      showBrand: true,
      stickyCta: true,
    },
    status: 'draft',
  }
  return applySiteComposition(site, 'cinematic-finance')
}

function text(value, fallback = '', limit = 1000) {
  return String(value == null ? fallback : value).slice(0, limit)
}

function color(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function imageUrl(value) {
  const input = text(value, '', 1200).trim()
  if (!input) return ''
  if (/^\/assets\/[a-z0-9_./-]+$/i.test(input)) return input
  try {
    const parsed = new URL(input)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''
  } catch {
    return ''
  }
}

function sanitizeItems(source, fallback, fields, limit = 6) {
  const items = Array.isArray(source) && source.length ? source : fallback
  return items.slice(0, limit).map((item, index) => {
    const base = fallback[index % fallback.length]
    return Object.fromEntries(fields.map(([key, max]) => [key, text(item?.[key], base?.[key], max)]))
  })
}

function sanitizeSectionStyle(source, type) {
  const fallback = initialSectionStyle(type)
  const input = source || {}
  const valid = (key, value) => SECTION_STYLE_OPTIONS[key].some(([id]) => id === value)
  const style = Object.fromEntries(Object.keys(SECTION_STYLE_OPTIONS).map((key) => [key, valid(key, input[key]) ? input[key] : fallback[key]]))
  const layouts = SITE_LAYOUT_OPTIONS[type] || []
  style.layout = layouts.some(([id]) => id === input.layout) ? input.layout : fallback.layout
  return style
}

function sanitizeTextStyle(rawValue) {
  const value = resolveDirectTextStyle(rawValue)
  const sanitized = {
      font: Object.prototype.hasOwnProperty.call(FONT_STACKS, value.font) ? value.font : 'pretendard',
      size: boundedNumber(value.size, 16, 8, 180),
      width: boundedNumber(value.width, 100, 32, 100),
      offsetX: boundedNumber(value.offsetX, 0, -240, 240),
      offsetY: boundedNumber(value.offsetY, 0, -180, 180),
      color: color(value.color, ''),
      colorRanges: (Array.isArray(value.colorRanges) ? value.colorRanges : []).slice(0, 40).map((range) => ({
        start: Math.max(0, Math.round(Number(range.start) || 0)),
        end: Math.max(0, Math.round(Number(range.end) || 0)),
        color: color(range.color, ''),
      })).filter((range) => range.color && range.end > range.start),
      colorText: text(value.colorText, '', 2000),
      textEffect: ['none', 'shadow', 'hard-shadow', 'glow', 'outline', 'depth'].includes(value.textEffect) ? value.textEffect : 'none',
      effectColor: color(value.effectColor, '#202126'),
      effectStrength: boundedNumber(value.effectStrength, 45, 10, 100),
      effectBlur: boundedNumber(value.effectBlur, 8, 0, 32),
      effectDistance: boundedNumber(value.effectDistance, 4, 0, 18),
  }
  if (Object.prototype.hasOwnProperty.call(rawValue || {}, 'align')) sanitized.align = ['left', 'center', 'right'].includes(value.align) ? value.align : 'left'
  return sanitized
}

function sanitizeTextStyles(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}
  return Object.fromEntries(Object.entries(source).slice(0, 80).map(([rawKey, rawValue]) => {
    const key = text(rawKey, '', 100)
    const sanitized = sanitizeTextStyle(rawValue)
    if (rawValue?.mobile && typeof rawValue.mobile === 'object' && !Array.isArray(rawValue.mobile)) sanitized.mobile = sanitizeTextStyle(rawValue.mobile)
    return [key, sanitized]
  }).filter(([key]) => key))
}

function sanitizeFormFieldStyles(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}
  return Object.fromEntries(Object.entries(source).slice(0, 120).map(([rawId, rawStyle]) => {
    const fieldId = text(rawId, '', 100)
    const style = rawStyle && typeof rawStyle === 'object' && !Array.isArray(rawStyle) ? rawStyle : {}
    const sanitized = {
      width: boundedNumber(style.width, 100, 42, 100),
      scale: boundedNumber(style.scale, 100, 70, 145),
    }
    if (Number.isFinite(Number(style.mobileWidth))) sanitized.mobileWidth = boundedNumber(style.mobileWidth, 100, 42, 100)
    if (Number.isFinite(Number(style.mobileScale))) sanitized.mobileScale = boundedNumber(style.mobileScale, 100, 70, 145)
    return [fieldId, sanitized]
  }).filter(([fieldId]) => fieldId))
}

function sanitizeSection(section) {
  const type = SITE_BLOCKS.some((block) => block.type === section?.type) ? section.type : 'story'
  const source = section?.data || {}
  const fallback = blockDefaults[type]
  const data = {}

  if (type === 'hero') Object.assign(data, {
    eyebrow: text(source.eyebrow, fallback.eyebrow, 80),
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    buttonLabel: text(source.buttonLabel, fallback.buttonLabel, 50),
    imageUrl: imageUrl(source.imageUrl),
    imageAlt: text(source.imageAlt, fallback.imageAlt, 180),
    imageMode: source.imageMode === 'background' ? 'background' : 'frame',
    overlayStrength: boundedNumber(source.overlayStrength, fallback.overlayStrength, 30, 92),
    imageFocus: boundedNumber(source.imageFocus, fallback.imageFocus, 0, 100),
    imagePositionY: boundedNumber(source.imagePositionY, fallback.imagePositionY, 0, 100),
    imageScale: boundedNumber(source.imageScale, fallback.imageScale, 100, 160),
    imageRatio: ['portrait', 'square', 'landscape'].includes(source.imageRatio) ? source.imageRatio : fallback.imageRatio,
    align: source.align === 'center' ? 'center' : 'left',
  })
  if (type === 'ticker') Object.assign(data, {
    items: (Array.isArray(source.items) && source.items.length ? source.items : fallback.items).slice(0, 8).map((item, index) => text(item, fallback.items[index % fallback.items.length], 80)),
  })
  if (type === 'benefits') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    items: sanitizeItems(source.items, fallback.items, [['title', 100], ['description', 300]], 4),
  })
  if (type === 'story') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 1200),
    imageUrl: imageUrl(source.imageUrl),
    imageAlt: text(source.imageAlt, fallback.imageAlt, 180),
    imageMode: source.imageMode === 'background' ? 'background' : 'frame',
    overlayStrength: boundedNumber(source.overlayStrength, fallback.overlayStrength, 20, 90),
    imagePosition: source.imagePosition === 'left' ? 'left' : 'right',
    imageFocus: boundedNumber(source.imageFocus, fallback.imageFocus, 0, 100),
    imagePositionY: boundedNumber(source.imagePositionY, fallback.imagePositionY, 0, 100),
    imageScale: boundedNumber(source.imageScale, fallback.imageScale, 100, 160),
    imageRatio: ['portrait', 'square', 'landscape'].includes(source.imageRatio) ? source.imageRatio : fallback.imageRatio,
  })
  if (type === 'cards') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    items: sanitizeItems(source.items, fallback.items, [['title', 100], ['description', 350]], 6),
  })
  if (type === 'stats') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    items: sanitizeItems(source.items, fallback.items, [['value', 50], ['label', 120]], 4),
  })
  if (type === 'steps') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    items: sanitizeItems(source.items, fallback.items, [['title', 100], ['description', 300]], 5),
  })
  if (type === 'quote') Object.assign(data, {
    quote: text(source.quote, fallback.quote, 500),
    name: text(source.name, fallback.name, 100),
    role: text(source.role, fallback.role, 120),
  })
  if (type === 'faq') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    items: sanitizeItems(source.items, fallback.items, [['question', 180], ['answer', 700]], 8),
  })
  if (type === 'form') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    emptyMessage: text(source.emptyMessage, fallback.emptyMessage, 200),
    questionSize: boundedNumber(source.questionSize, fallback.questionSize, 12, 34),
    descriptionSize: boundedNumber(source.descriptionSize, fallback.descriptionSize, 10, 24),
    inputSize: boundedNumber(source.inputSize, fallback.inputSize, 11, 24),
    inputHeight: boundedNumber(source.inputHeight, fallback.inputHeight, 40, 76),
    fieldSpacing: boundedNumber(source.fieldSpacing, fallback.fieldSpacing, 6, 34),
    fieldOrder: (Array.isArray(source.fieldOrder) ? source.fieldOrder : fallback.fieldOrder)
      .slice(0, 120)
      .filter((fieldId) => typeof fieldId === 'string')
      .map((fieldId) => text(fieldId, '', 100))
      .filter((fieldId, index, values) => fieldId && values.indexOf(fieldId) === index),
    fieldStyles: sanitizeFormFieldStyles(source.fieldStyles),
  })
  if (type === 'cta') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    buttonLabel: text(source.buttonLabel, fallback.buttonLabel, 50),
  })
  if (type === 'notice') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 2000),
  })
  if (type === 'divider') Object.assign(data, {
    label: text(source.label, fallback.label, 80),
  })

  return {
    id: typeof section?.id === 'string' && section.id ? section.id.slice(0, 80) : id(),
    type,
    enabled: section?.enabled !== false,
    style: sanitizeSectionStyle(section?.style, type),
    textStyles: sanitizeTextStyles(section?.textStyles),
    data,
  }
}

export function sanitizeSite(input) {
  const base = emptySite()
  const title = text(input?.title, '', 120).trim()
  if (!title) throw new Error('사이트 제목을 입력해 주세요.')
  const rawSections = Array.isArray(input?.content?.sections) ? input.content.sections : base.content.sections
  const sections = rawSections.slice(0, MAX_SITE_SECTIONS).map(sanitizeSection)
  if (!sections.some((section) => section.type === 'hero')) sections.unshift(makeSiteSection('hero'))
  if (!sections.some((section) => section.type === 'form')) sections.push(makeSiteSection('form'))
  const radius = Number(input?.theme?.radius)
  const font = Object.prototype.hasOwnProperty.call(FONT_STACKS, input?.theme?.font) ? input.theme.font : base.theme.font
  return {
    title,
    slug: normalizeSlug(input?.slug, title).replace(/^form-/, 'page-'),
    form_project_id: input?.formProjectId || null,
    content: {
      brandName: text(input?.content?.brandName, base.content.brandName, 80),
      sections,
    },
    theme: {
      mode: input?.theme?.mode === 'light' ? 'light' : 'dark',
      accent: color(input?.theme?.accent, base.theme.accent),
      background: color(input?.theme?.background, base.theme.background),
      surface: color(input?.theme?.surface, base.theme.surface),
      text: color(input?.theme?.text, base.theme.text),
      muted: color(input?.theme?.muted, base.theme.muted),
      line: color(input?.theme?.line, base.theme.line),
      radius: Number.isFinite(radius) ? Math.min(32, Math.max(0, radius)) : base.theme.radius,
      font,
      displayScale: boundedNumber(input?.theme?.displayScale, base.theme.displayScale, .75, 1.35),
      bodyScale: boundedNumber(input?.theme?.bodyScale, base.theme.bodyScale, .8, 1.25),
      sectionScale: boundedNumber(input?.theme?.sectionScale, base.theme.sectionScale, .7, 1.35),
    },
    settings: {
      footerText: text(input?.settings?.footerText, base.settings.footerText, 500),
      showBrand: input?.settings?.showBrand !== false,
      stickyCta: input?.settings?.stickyCta !== false,
    },
    status: input?.status === 'published' ? 'published' : 'draft',
  }
}

export function siteThemeStyle(theme) {
  const value = theme || SITE_THEME_PRESETS[0].theme
  return {
    '--site-accent': value.accent,
    '--site-bg': value.background,
    '--site-surface': value.surface,
    '--site-text': value.text,
    '--site-muted': value.muted,
    '--site-line': value.line,
    '--site-radius': `${value.radius ?? 18}px`,
    '--site-font': FONT_STACKS[value.font] || FONT_STACKS.pretendard,
    '--site-display-scale': value.displayScale ?? 1,
    '--site-body-scale': value.bodyScale ?? 1,
    '--site-section-scale': value.sectionScale ?? 1,
  }
}
