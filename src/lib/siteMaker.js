import { FONT_STACKS } from './maker'
import { normalizeSlug } from './validation'

export const SITE_BLOCKS = [
  { type: 'hero', label: '첫 화면', description: '제목과 핵심 신청 버튼' },
  { type: 'benefits', label: '핵심 안내', description: '신청자가 바로 이해할 세 가지' },
  { type: 'story', label: '상세 설명', description: '이미지와 설명을 함께 배치' },
  { type: 'form', label: '신청 폼', description: '기존 폼을 응답 시스템과 연결' },
  { type: 'notice', label: '안내사항', description: '주의사항과 책임 고지' },
]

export const SITE_THEME_PRESETS = [
  {
    id: 'signal',
    name: '시그널 다크',
    theme: { mode: 'dark', accent: '#55d98b', background: '#0d1219', surface: '#151c25', text: '#f2f6f4', muted: '#a3afa9', line: '#2c3641', radius: 18, font: 'pretendard' },
  },
  {
    id: 'cobalt',
    name: '코발트 라이트',
    theme: { mode: 'light', accent: '#2458d3', background: '#eef3f8', surface: '#ffffff', text: '#182231', muted: '#657184', line: '#d4dce6', radius: 16, font: 'pretendard' },
  },
  {
    id: 'coral',
    name: '코랄 에디토리얼',
    theme: { mode: 'light', accent: '#d45443', background: '#f4f0eb', surface: '#fffdf9', text: '#292622', muted: '#756f68', line: '#dcd4cb', radius: 12, font: 'gowun' },
  },
]

const blockDefaults = {
  hero: {
    eyebrow: '실시간 대응 알림',
    title: '변화가 올 때, 바로 대응하세요',
    description: '핵심 변화와 확인할 기준을 정리해 빠르게 알려드립니다.',
    buttonLabel: '알림 신청하기',
    imageUrl: '',
    imageAlt: '서비스를 소개하는 대표 이미지',
    align: 'left',
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
    imagePosition: 'right',
  },
  form: {
    title: '대응 알림 신청',
    description: '아래 항목을 입력하면 기존 응답 관리자와 백업 흐름으로 바로 연결됩니다.',
    emptyMessage: '오른쪽 설정에서 연결할 폼을 선택해 주세요.',
  },
  notice: {
    title: '신청 전 확인해 주세요',
    description: '제공되는 내용은 참고용이며 특정 결과를 보장하지 않습니다. 최종 판단과 책임은 신청자 본인에게 있습니다.',
  },
}

function id() {
  return crypto.randomUUID()
}

export function makeSiteSection(type) {
  const safeType = SITE_BLOCKS.some((block) => block.type === type) ? type : 'story'
  return { id: id(), type: safeType, enabled: true, data: structuredClone(blockDefaults[safeType]) }
}

export function emptySite() {
  const preset = SITE_THEME_PRESETS[0]
  return {
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
}

function text(value, fallback = '', limit = 1000) {
  return String(value == null ? fallback : value).slice(0, limit)
}

function color(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback
}

function imageUrl(value) {
  const input = text(value, '', 1200).trim()
  if (!input) return ''
  try {
    const parsed = new URL(input)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''
  } catch {
    return ''
  }
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
    align: source.align === 'center' ? 'center' : 'left',
  })
  if (type === 'benefits') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    items: (Array.isArray(source.items) ? source.items : fallback.items).slice(0, 4).map((item, index) => ({
      title: text(item?.title, fallback.items[index % fallback.items.length].title, 100),
      description: text(item?.description, fallback.items[index % fallback.items.length].description, 300),
    })),
  })
  if (type === 'story') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 1200),
    imageUrl: imageUrl(source.imageUrl),
    imageAlt: text(source.imageAlt, fallback.imageAlt, 180),
    imagePosition: source.imagePosition === 'left' ? 'left' : 'right',
  })
  if (type === 'form') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 500),
    emptyMessage: text(source.emptyMessage, fallback.emptyMessage, 200),
  })
  if (type === 'notice') Object.assign(data, {
    title: text(source.title, fallback.title, 180),
    description: text(source.description, fallback.description, 2000),
  })

  return {
    id: typeof section?.id === 'string' && section.id ? section.id.slice(0, 80) : id(),
    type,
    enabled: section?.enabled !== false,
    data,
  }
}

export function sanitizeSite(input) {
  const base = emptySite()
  const title = text(input?.title, '', 120).trim()
  if (!title) throw new Error('사이트 제목을 입력해 주세요.')
  const rawSections = Array.isArray(input?.content?.sections) ? input.content.sections : base.content.sections
  const sections = rawSections.slice(0, 12).map(sanitizeSection)
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
  }
}
