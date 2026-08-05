import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FormCanvas from '../src/components/FormCanvas'
import InlineFieldEditor from '../src/components/InlineFieldEditor'
import ProjectColorPicker from '../src/components/ProjectColorPicker'
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

  it('renders consent title, checkbox copy, and policy link as separate content', () => {
    const project = emptyProject()
    project.pages[0].fields = [{ id: 'agree', type: 'consent', label: '개인정보 처리 동의', description: '내용을 읽고 확인해 주세요.', consentText: '개인정보 수집 및 이용에 동의합니다.', consentLinkLabel: '처리방침 보기', consentLinkUrl: 'https://example.com/privacy', required: true, options: [], scale: 5 }]
    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={1} answers={{}} preview />)

    expect(html.match(/개인정보 처리 동의/g)).toHaveLength(1)
    expect(html.match(/개인정보 수집 및 이용에 동의합니다/g)).toHaveLength(1)
    expect(html).toContain('consent-copy')
    expect(html).toContain('처리방침 보기')
    expect(html).toContain('https://example.com/privacy')
  })

  it('makes the checkbox copy directly editable in the form canvas', () => {
    const field = { id: 'agree', type: 'consent', label: '개인정보 처리 동의', description: '', consentText: '직접 수정할 문구', required: true, options: [], scale: 5 }
    const html = renderToStaticMarkup(<InlineFieldEditor field={field} index={0} total={1} selected consentLabel="기본 동의" onSelect={() => {}} onChange={() => {}} onDuplicate={() => {}} onDelete={() => {}} onMove={() => {}} />)

    expect(html).toContain('체크박스 문구 · 눌러서 바로 수정')
    expect(html).toContain('직접 수정할 문구')
    expect(html).toContain('안내 링크 주소')
  })

  it('shows the configured restart action after a successful submission', () => {
    const project = emptyProject()
    project.settings.restartLabel = '다시 신청하기'
    const html = renderToStaticMarkup(<FormCanvas project={project} submitted onRestart={() => {}} />)
    expect(html).toContain('다시 신청하기')
  })

  it('renders every form color and marks the current selection', () => {
    const html = renderToStaticMarkup(<ProjectColorPicker value="mint" onChange={() => {}} />)

    expect(html.match(/project-color-dot/g)).toHaveLength(7)
    expect(html).toContain('민트 구분 색상')
    expect(html).toContain('aria-pressed="true"')
  })
})
