import { describe, expect, it } from 'vitest'
import { emptySite, makeSiteSection, sanitizeSite, SITE_BLOCKS } from '../src/lib/siteMaker'

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
    })
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

  it('upgrades old sections that do not have style settings', () => {
    const base = emptySite()
    const legacySections = base.content.sections.map(({ style, ...section }) => section)
    const result = sanitizeSite({ ...base, title: '이전 사이트', content: { ...base.content, sections: legacySections } })
    expect(result.content.sections.every((section) => section.style.pattern)).toBe(true)
    expect(result.content.sections.find((section) => section.type === 'hero').style.pattern).toBe('grid')
  })
})
