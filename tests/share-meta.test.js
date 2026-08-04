import { describe, expect, it } from 'vitest'
import { injectShareMetadata, shareMetadata } from '../api/share.js'

describe('public form share metadata', () => {
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
    const html = injectShareMetadata('<html><head><meta name="description" content="old"><title>old</title></head><body></body></html>', {
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
  })

  it('falls back to the form title and description', () => {
    expect(shareMetadata({ title: '예약 신청', description: '날짜를 골라주세요.', settings: {}, theme: {} }, 'https://example.com/s/reservation')).toMatchObject({
      title: '예약 신청',
      description: '날짜를 골라주세요.',
      image: '',
    })
  })
})
