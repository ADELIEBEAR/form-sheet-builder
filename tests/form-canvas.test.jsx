import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FormCanvas from '../src/components/FormCanvas'
import { emptyProject, formSteps, makePage } from '../src/lib/maker'

describe('focused form canvas', () => {
  it('renders before live answer state has been created', () => {
    const project = emptyProject()
    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={1} preview />)

    expect(html).toContain('이름을 입력해 주세요')
  })

  it('keeps question navigation in one order across multiple pages', () => {
    const project = emptyProject()
    const secondPage = makePage(1)
    project.pages.push(secondPage)
    const steps = formSteps(project)

    expect(steps).toHaveLength(3)
    expect(steps[0].pageIndex).toBe(0)
    expect(steps[2].pageIndex).toBe(1)
    expect(steps[2].field.id).toBe(secondPage.fields[0].id)
  })

  it('uses the current page typography on its question screen', () => {
    const project = emptyProject()
    project.pages[0].typography = { titleSize: 38, questionSize: 47, bodySize: 20 }

    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={1} preview />)

    expect(html).toContain('--preview-title-size:38px')
    expect(html).toContain('--preview-question-size:47px')
    expect(html).toContain('--preview-body-size:20px')
  })

  it('renders customized copy, image placement, and transition choices', () => {
    const project = emptyProject()
    project.settings.coverKicker = 'HELLO'
    project.settings.startStatusLabel = '준비'
    project.settings.startLabel = '바로 참여'
    project.theme.coverUrl = 'https://example.com/cover.webp'
    project.theme.imageMode = 'banner'
    project.theme.transition = 'slide'

    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={0} preview />)

    expect(html).toContain('HELLO')
    expect(html).toContain('준비')
    expect(html).toContain('바로 참여')
    expect(html).toContain('form-media-banner')
    expect(html).toContain('transition-slide')
  })
})
