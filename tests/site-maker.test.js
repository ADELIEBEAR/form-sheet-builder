import { describe, expect, it } from 'vitest'
import {
  addSiteCollectionItem,
  alignSiteSection,
  applySiteComposition,
  emptySite,
  makeSiteSection,
  MAX_SITE_SECTIONS,
  orderedSiteFormFields,
  removeSiteCollectionItem,
  sanitizeSite,
  SITE_BLOCKS,
  SITE_COLLECTION_RULES,
  SITE_COMPOSITION_PRESETS,
  SITE_LAYOUT_OPTIONS,
} from '../src/lib/siteMaker'

describe('landing site maker', () => {
  it('keeps code-native design settings compact', () => {
    const site = emptySite()
    const bytes = new TextEncoder().encode(JSON.stringify(site)).length
    expect(bytes).toBeLessThan(20 * 1024)
    expect(site.content.sections.every((section) => section.style)).toBe(true)
  })

  it('provides every block with defaults and responsive style tokens', () => {
    SITE_BLOCKS.forEach(({ type }) => {
      const section = makeSiteSection(type)
      expect(section.type).toBe(type)
      expect(section.data).toBeTruthy()
      expect(section.style.width).toBeTruthy()
      expect(section.style.spacing).toBeTruthy()
      expect(SITE_LAYOUT_OPTIONS[type].some(([layout]) => layout === section.style.layout)).toBe(true)
    })
  })

  it('applies a full composition without replacing written content', () => {
    const site = emptySite()
    const title = site.content.sections[0].data.title
    const result = applySiteComposition(site, SITE_COMPOSITION_PRESETS.find((preset) => preset.id === 'poster').id)
    expect(result.content.sections[0].data.title).toBe(title)
    expect(result.content.sections[0].style.layout).toBe('poster')
    expect(result.theme.accent).not.toBe(site.theme.accent)
  })

  it('applies the cinematic finance stage and compact live-form sizing', () => {
    const site = emptySite()
    const title = site.content.sections[0].data.title
    const result = sanitizeSite(applySiteComposition(site, 'cinematic-finance'))
    const hero = result.content.sections.find((section) => section.type === 'hero')
    const form = result.content.sections.find((section) => section.type === 'form')
    expect(hero.data.title).toBe(title)
    expect(hero.style.layout).toBe('cinematic')
    expect(hero.data.overlayStrength).toBe(76)
    expect(hero.data.imageFocus).toBe(52)
    expect(form.data.questionSize).toBe(14)
    expect(form.data.inputHeight).toBe(42)
  })

  it('stores direct text design safely and clamps oversized values', () => {
    const site = emptySite()
    site.content.sections[0].textStyles = {
      '첫 화면 제목': {
        font: 'pretendard',
        size: 999,
        width: 4,
        offsetX: 1000,
        color: '#7357d6',
        colorRanges: [{ start: 0, end: 2, color: '#ff4466' }],
        textEffect: 'glow',
        effectStrength: 999,
      },
    }
    const result = sanitizeSite(site)
    const style = result.content.sections[0].textStyles['첫 화면 제목']
    expect(style.size).toBe(180)
    expect(style.width).toBe(32)
    expect(style.offsetX).toBe(240)
    expect(style.colorRanges).toHaveLength(1)
    expect(style.textEffect).toBe('glow')
    expect(style.effectStrength).toBe(100)
  })

  it('aligns a whole block without keeping conflicting per-text alignment', () => {
    const section = makeSiteSection('hero')
    section.textStyles = {
      '첫 화면 제목': { size: 72, width: 70, align: 'left', mobile: { size: 38, width: 90, align: 'right' } },
      '첫 화면 설명': { size: 17, align: 'right' },
    }
    const aligned = alignSiteSection(section, 'center')
    expect(aligned.style.align).toBe('center')
    expect(aligned.textStyles['첫 화면 제목']).toEqual({ size: 72, width: 70, mobile: { size: 38, width: 90 } })
    expect(aligned.textStyles['첫 화면 설명']).toEqual({ size: 17 })

    const sanitized = sanitizeSite({ ...emptySite(), content: { ...emptySite().content, sections: [aligned, makeSiteSection('form')] } })
    expect(sanitized.content.sections[0].textStyles['첫 화면 제목']).not.toHaveProperty('align')
    expect(sanitized.content.sections[0].textStyles['첫 화면 제목'].mobile).not.toHaveProperty('align')
    expect(sanitized.content.sections[0].textStyles['첫 화면 제목'].mobile.size).toBe(38)
  })

  it('sanitizes new block content and clamps visual scale settings', () => {
    const base = emptySite()
    const stats = makeSiteSection('stats')
    stats.data.items = Array.from({ length: 10 }, (_, index) => ({ value: `값 ${index}`, label: `설명 ${index}` }))
    stats.style = { tone: 'invalid', spacing: 'air', width: 'narrow', align: 'center', pattern: 'dots' }
    const result = sanitizeSite({
      ...base,
      title: '테스트 사이트',
      content: { ...base.content, sections: [base.content.sections[0], stats, base.content.sections[3]] },
      theme: { ...base.theme, displayScale: 9, bodyScale: 0, sectionScale: 2 },
    })
    const sanitizedStats = result.content.sections.find((section) => section.type === 'stats')
    expect(sanitizedStats.data.items).toHaveLength(4)
    expect(sanitizedStats.style.tone).toBe('inherit')
    expect(sanitizedStats.style.spacing).toBe('air')
    expect(sanitizedStats.style.pattern).toBe('dots')
    expect(result.theme.displayScale).toBe(1.35)
    expect(result.theme.bodyScale).toBe(0.8)
    expect(result.theme.sectionScale).toBe(1.35)
  })

  it('keeps image crop controls inside safe bounds', () => {
    const site = emptySite()
    const hero = site.content.sections.find((section) => section.type === 'hero')
    hero.data.imageFocus = -50
    hero.data.imagePositionY = 500
    hero.data.imageScale = 999
    hero.data.imageRatio = 'unknown'
    const result = sanitizeSite(site)
    const savedHero = result.content.sections.find((section) => section.type === 'hero')
    expect(savedHero.data.imageFocus).toBe(0)
    expect(savedHero.data.imagePositionY).toBe(100)
    expect(savedHero.data.imageScale).toBe(160)
    expect(savedHero.data.imageRatio).toBe('portrait')
  })

  it('upgrades old sections that do not have style settings', () => {
    const base = emptySite()
    const legacySections = base.content.sections.map(({ style, ...section }) => section)
    const result = sanitizeSite({ ...base, title: '이전 사이트', content: { ...base.content, sections: legacySections } })
    expect(result.content.sections.every((section) => section.style.pattern)).toBe(true)
    expect(result.content.sections.find((section) => section.type === 'hero').style.pattern).toBe('grid')
  })

  it('keeps landing form sizing safe and stores a compact question order', () => {
    const base = emptySite()
    const form = base.content.sections.find((section) => section.type === 'form')
    form.data.questionSize = 200
    form.data.descriptionSize = 1
    form.data.inputSize = 40
    form.data.inputHeight = 999
    form.data.fieldSpacing = -10
    form.data.fieldOrder = ['field-c', 'field-a', 'field-c', '', 123]
    form.data.fieldStyles = { 'field-a': { width: 1, scale: 300, mobileWidth: 2, mobileScale: 200 }, 'field-b': { width: 76, scale: 115 }, '': { width: 80 } }
    const result = sanitizeSite({ ...base, title: '폼 크기 테스트' })
    const sanitized = result.content.sections.find((section) => section.type === 'form').data
    expect(sanitized.questionSize).toBe(34)
    expect(sanitized.descriptionSize).toBe(10)
    expect(sanitized.inputSize).toBe(24)
    expect(sanitized.inputHeight).toBe(76)
    expect(sanitized.fieldSpacing).toBe(6)
    expect(sanitized.fieldOrder).toEqual(['field-c', 'field-a'])
    expect(sanitized.fieldStyles).toEqual({
      'field-a': { width: 42, scale: 145, mobileWidth: 42, mobileScale: 145 },
      'field-b': { width: 76, scale: 115 },
    })
  })

  it('reorders landing questions by stable field id and appends new questions', () => {
    const project = { pages: [
      { fields: [{ id: 'field-a', label: '이름' }, { id: 'field-b', label: '연락처' }] },
      { fields: [{ id: 'field-c', label: '동의' }] },
    ] }
    const result = orderedSiteFormFields(project, ['field-c', 'missing', 'field-a', 'field-c'])
    expect(result.map((field) => field.id)).toEqual(['field-c', 'field-a', 'field-b'])
  })

  it('adds and removes repeatable content without exceeding safe limits', () => {
    Object.entries(SITE_COLLECTION_RULES).forEach(([type, rule]) => {
      let section = makeSiteSection(type)
      while (section.data.items.length < rule.max) section = addSiteCollectionItem(section)
      expect(section.data.items).toHaveLength(rule.max)
      expect(addSiteCollectionItem(section)).toBe(section)
      while (section.data.items.length > rule.min) section = removeSiteCollectionItem(section, 0)
      expect(section.data.items).toHaveLength(rule.min)
      expect(removeSiteCollectionItem(section, 0)).toBe(section)
    })
  })

  it('silently clamps oversized legacy pages instead of storing unbounded JSON', () => {
    const base = emptySite()
    const sections = Array.from({ length: MAX_SITE_SECTIONS + 12 }, () => makeSiteSection('story'))
    sections[0] = makeSiteSection('hero')
    sections[1] = makeSiteSection('form')
    const result = sanitizeSite({ ...base, title: '큰 사이트', content: { ...base.content, sections } })
    expect(result.content.sections).toHaveLength(MAX_SITE_SECTIONS)
  })
})
