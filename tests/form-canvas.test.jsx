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
})
