import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FormCanvas from '../src/components/FormCanvas'
import DirectCanvasText, { snapToGridValue } from '../src/components/DirectCanvasText'
import InlineFieldEditor from '../src/components/InlineFieldEditor'
import InlineFormCanvas, { COVER_VIEW } from '../src/components/InlineFormCanvas'
import ProjectColorPicker from '../src/components/ProjectColorPicker'
import { emptyProject, formSteps, makePage } from '../src/lib/maker'
import { applyTextColorRange, rebaseTextColorRanges } from '../src/lib/richText'

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
    project.pages[0].typography = { titleSize: 38, questionSize: 47, bodySize: 20, questionWeight: 610, questionLineHeight: 142, questionTracking: -2.4, textAlign: 'center' }

    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={1} preview />)

    expect(html).toContain('--preview-title-size:38px')
    expect(html).toContain('--preview-question-size:47px')
    expect(html).toContain('--preview-body-size:20px')
    expect(html).toContain('--preview-question-weight:610')
    expect(html).toContain('--preview-question-line:1.42')
    expect(html).toContain('--preview-question-tracking:-0.024em')
    expect(html).toContain('--preview-text-align:center')
  })

  it('renders saved direct text size, width, position, font, and alignment', () => {
    const project = emptyProject()
    project.pages[0].fields[0].directStyles = { question: { font: 'hahmlet', size: 44, width: 73, offsetX: 18, offsetY: -12, align: 'center' }, questionMobile: { font: 'jua', size: 34, width: 88, offsetX: 8, offsetY: 16, align: 'left' } }

    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={1} preview />)

    expect(html).toContain('--public-direct-size:44px')
    expect(html).toContain('--public-direct-width:73%')
    expect(html).toContain('--public-direct-x:18px')
    expect(html).toContain('--public-direct-y:-12px')
    expect(html).toContain('--public-direct-align:center')
    expect(html).toContain('--public-mobile-size:34px')
    expect(html).toContain('--public-mobile-width:88%')
    expect(html).toContain('--public-mobile-x:8px')
    expect(html).toContain('--public-mobile-y:16px')
    expect(html).toContain('--public-mobile-align:left')
    expect(html).toContain('Hahmlet')
    expect(html).toContain('Jua')
  })

  it('shows direct manipulation controls on the selected canvas text', () => {
    const html = renderToStaticMarkup(<DirectCanvasText label="질문" value={{ font: 'pretendard', size: 32, width: 100, offsetX: 0, offsetY: 0, align: 'left' }} fallback={{ size: 32 }} minSize={20} maxSize={72} selected onSelect={() => {}} onChange={() => {}}><span>질문 내용</span></DirectCanvasText>)

    expect(html).toContain('질문 빠른 디자인')
    expect(html).toContain('질문 위치 이동')
    expect(html).toContain('질문 너비 조절')
    expect(html).toContain('질문 글자 크기 조절')
  })

  it('snaps freeform canvas values to the nearest editor grid line', () => {
    expect(snapToGridValue(13, 8)).toBe(16)
    expect(snapToGridValue(-13, 8)).toBe(-16)
    expect(snapToGridValue(71, 4)).toBe(72)
  })

  it('stores color on only the selected characters and keeps it aligned after typing', () => {
    const ranges = applyTextColorRange([], 6, 1, 4, '#ff3366')
    expect(ranges).toEqual([{ start: 1, end: 4, color: '#ff3366' }])
    expect(rebaseTextColorRanges(ranges, 'abcdef', 'aZZbcdef')).toEqual([{ start: 1, end: 6, color: '#ff3366' }])
  })

  it('renders separate character colors for desktop and mobile applicants', () => {
    const project = emptyProject()
    project.title = '신청폼'
    project.theme.directStyles = {
      coverTitle: { color: '#111111', colorText: '신청폼', colorRanges: [{ start: 0, end: 2, color: '#ff3366' }] },
      coverTitleMobile: { color: '#222222', colorText: '신청폼', colorRanges: [{ start: 2, end: 3, color: '#3366ff' }] },
    }
    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={0} preview />)

    expect(html).toContain('public-rich-desktop')
    expect(html).toContain('public-rich-mobile')
    expect(html).toContain('color:#ff3366')
    expect(html).toContain('color:#3366ff')
  })

  it('uses compact direct controls and a separate style scope in mobile preview', () => {
    const project = emptyProject()
    const html = renderToStaticMarkup(<InlineFormCanvas project={project} pageIndex={0} selectedFieldId={COVER_VIEW} device="mobile" snapToGrid onProjectChange={() => {}} onPageChange={() => {}} onNavigate={() => {}} onFieldSelect={() => {}} onFieldChange={() => {}} onFieldAdd={() => {}} onFieldDuplicate={() => {}} onFieldDelete={() => {}} onFieldMove={() => {}} />)

    expect(html).toContain('mobile-canvas-editing')
    expect(html).toContain('snap-grid-active')
    expect(html).toContain('>모바일</em>')
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
