import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FormCanvas from '../src/components/FormCanvas'
import { emptyProject } from '../src/lib/maker'

describe('focused form canvas', () => {
  it('renders before live answer state has been created', () => {
    const project = emptyProject()
    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={1} preview />)

    expect(html).toContain('이름을 입력해 주세요')
  })
})
