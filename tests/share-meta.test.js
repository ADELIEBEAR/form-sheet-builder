import { describe, expect, it } from 'vitest'
import { injectShareMetadata, shareMetadata, siteShareMetadata } from '../api/share.js'
import { publicFormPath, publicFormUrl, publicSitePath, publicSiteUrl, shareVersion } from '../src/lib/share.js'

describe('public form share metadata', () => {
  it('adds a stable edit version so messenger previews refresh after changes', () => {
    const project = { slug: 'stock-application', updatedAt: '2026-08-05T10:30:00.000Z' }
    const version = shareVersion(project.updatedAt)

    expect(publicFormPath(project)).toBe(`/s/stock-application?v=${version}`)
    expect(publicFormUrl(project, 'https://form-maker-next.vercel.app')).toBe(`https://form-maker-next.vercel.app/s/stock-application?v=${version}`)
  })

  it('keeps a clean working link when the edit date is unavailable', () => {
    expect(publicFormPath({ slug: '한글-신청', updatedAt: '' })).toBe('/s/%ED%95%9C%EA%B8%80-%EC%8B%A0%EC%B2%AD')
  })

  it('uses per-form copy and the cover image', () => {
    const metadata = shareMetadata({
      title: '기본 제목',
      description: '기본 설명',
      settings: { shareTitle: '주식 신청 안내', shareDescription: '신청 전에 내용을 확인해 주세요.', shareImageMode: 'cover' },
      theme: { coverUrl: 'https://example.com/cover.webp' },
    }, 'https://form-maker-next.vercel.app/s/stock')

    expect(metadata).toEqual({
      title: '주식 신청 안내',
      description: '신청 전에 내용을 확인해 주세요.',
      image: 'https://example.com/cover.webp',
      pageUrl: 'https://form-maker-next.vercel.app/s/stock',
    })
  })

  it('escapes copy before injecting Open Graph tags', () => {
    const html = injectShareMetadata('<html><head><meta name="description" content="old"><meta property="og:site_name" content="폼메이커 · 정석제작"><meta property="og:title" content="old title"><meta property="og:description" content="old description"><meta name="twitter:title" content="old title"><title>old</title></head><body></body></html>', {
      title: '주식 <신청> "안내"',
      description: 'A & B',
      image: '',
      pageUrl: 'https://example.com/s/test',
    })

    expect(html).toContain('<title>주식 &lt;신청&gt; &quot;안내&quot;</title>')
    expect(html).toContain('property="og:title" content="주식 &lt;신청&gt; &quot;안내&quot;"')
    expect(html).toContain('property="og:description" content="A &amp; B"')
    expect(html).not.toContain('property="og:image"')
    expect(html).not.toContain('content="old"')
    expect(html).not.toContain('old title')
    expect(html).not.toContain('old description')
    expect(html).not.toContain('og:site_name')
    expect(html.match(/property="og:title"/g)).toHaveLength(1)
    expect(html.match(/property="og:description"/g)).toHaveLength(1)
  })

  it('falls back to the form title and description', () => {
    expect(shareMetadata({ title: '예약 신청', description: '날짜를 골라주세요.', settings: {}, theme: {} }, 'https://example.com/s/reservation')).toMatchObject({
      title: '예약 신청',
      description: '날짜를 골라주세요.',
      image: '',
    })
  })

  it('builds a versioned public site link and uses site copy for messenger previews', () => {
    const site = {
      slug: 'semicon-signal',
      title: '삼성전자 대응알림',
      updatedAt: '2026-08-06T03:00:00.000Z',
      content: { sections: [{ type: 'hero', data: { title: '흔들릴 때 확인할 기준', description: '중요한 변화를 빠르게 알려드립니다.', imageUrl: 'https://example.com/site.webp' } }] },
    }
    const version = shareVersion(site.updatedAt)
    expect(publicSitePath(site)).toBe(`/p/semicon-signal?v=${version}`)
    expect(publicSiteUrl(site, 'https://form-maker-next.vercel.app')).toBe(`https://form-maker-next.vercel.app/p/semicon-signal?v=${version}`)
    expect(siteShareMetadata(site, 'https://form-maker-next.vercel.app/p/semicon-signal')).toEqual({
      title: '삼성전자 대응알림',
      description: '중요한 변화를 빠르게 알려드립니다.',
      image: 'https://example.com/site.webp',
      pageUrl: 'https://form-maker-next.vercel.app/p/semicon-signal',
    })
  })
})
