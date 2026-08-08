import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SiteRenderer from '../src/components/SiteRenderer'
import ThemePanel from '../src/components/ThemePanel'
import { emptyProject } from '../src/lib/maker'
import { emptySite } from '../src/lib/siteMaker'

describe('direct image controls', () => {
  it('shows form background placement and direct crop controls next to the upload', () => {
    const project = emptyProject()
    project.theme.coverUrl = 'https://example.com/form-cover.webp'
    project.theme.imageMode = 'background'
    const html = renderToStaticMarkup(<ThemePanel project={project} projectId="form-1" onChange={() => {}} />)
    expect(html).toContain('배경·이미지')
    expect(html).toContain('전체 배경')
    expect(html).toContain('사진을 끌어 위치 조절')
    expect(html).toContain('중앙 맞춤')
  })

  it('renders a landing hero image as the full block background', () => {
    const site = emptySite()
    const hero = site.content.sections.find((section) => section.type === 'hero')
    hero.style.layout = 'split'
    hero.data.imageUrl = 'https://example.com/hero.webp'
    hero.data.imageMode = 'background'
    hero.data.imageFocus = 24
    hero.data.imagePositionY = 68
    const html = renderToStaticMarkup(<SiteRenderer site={site} />)
    expect(html).toContain('has-section-background-image')
    expect(html).toContain('site-section-image-background')
    expect(html).toContain('--site-image-x:24%')
    expect(html).not.toContain('class="site-hero-image"')
  })
})
