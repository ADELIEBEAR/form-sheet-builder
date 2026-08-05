import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FormCanvas from '../src/components/FormCanvas'
import FormCopyPanel from '../src/components/FormCopyPanel'
import DirectCanvasButton, { directButtonOffsetBounds } from '../src/components/DirectCanvasButton'
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
    expect(html).toContain('질문 글자 효과')
  })

  it('renders separate desktop and mobile text effects for applicants', () => {
    const project = emptyProject()
    project.pages[0].fields[0].directStyles = {
      question: { textEffect: 'shadow', effectColor: '#3155aa', effectStrength: 60, effectBlur: 12, effectDistance: 5 },
      questionMobile: { textEffect: 'outline', effectColor: '#aa3355', effectStrength: 80, effectDistance: 6 },
    }

    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={1} preview />)

    expect(html).toContain('--public-direct-shadow:3.3px 5px 12px color-mix(in srgb, #3155aa 60%, transparent)')
    expect(html).toContain('--public-mobile-shadow:none')
    expect(html).toContain('--public-mobile-stroke:1.7px color-mix(in srgb, #aa3355 80%, transparent)')
  })

  it('shows direct button movement and width controls in the canvas', () => {
    const html = renderToStaticMarkup(<DirectCanvasButton label="시작 버튼" value={{ width: 144, offsetX: 8, offsetY: -4 }} fallback={{ width: 128 }} selected onSelect={() => {}} onChange={() => {}}><button type="button">시작하기</button></DirectCanvasButton>)

    expect(html).toContain('시작 버튼 위치 조절')
    expect(html).toContain('시작 버튼 빠른 배치')
    expect(html).toContain('시작 버튼 너비 조절')
    expect(html).toContain('--direct-button-width:144px')
    expect(html).toContain('클릭하면 실행 · 끌면 이동')
  })

  it('keeps direct button dragging inside the preview bounds', () => {
    expect(directButtonOffsetBounds(
      { left: 120, right: 248, top: 310, bottom: 358 },
      { left: 80, right: 520, top: 120, bottom: 500 },
      { offsetX: 24, offsetY: -8 },
      { minX: -720, maxX: 720, minY: -720, maxY: 720 },
    )).toEqual({ minX: -16, maxX: 296, minY: -198, maxY: 134 })
  })

  it('renders separate desktop and mobile button placement for applicants', () => {
    const project = emptyProject()
    project.theme.buttonStyles = {
      start: { width: 180, offsetX: 24, offsetY: -8 },
      startMobile: { width: 132, offsetX: -12, offsetY: 10 },
    }

    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={0} preview />)

    expect(html).toContain('--public-button-width:180px')
    expect(html).toContain('--public-button-x:24px')
    expect(html).toContain('--public-mobile-button-width:132px')
    expect(html).toContain('--public-mobile-button-y:10px')
  })

  it('keeps desktop-only button placement from spilling into mobile', () => {
    const project = emptyProject()
    project.theme.buttonStyles = {
      start: { width: 360, offsetX: 220, offsetY: 140 },
    }

    const publicHtml = renderToStaticMarkup(<FormCanvas project={project} pageIndex={0} preview />)
    const editorHtml = renderToStaticMarkup(<InlineFormCanvas project={project} pageIndex={0} selectedFieldId={COVER_VIEW} device="mobile" onProjectChange={() => {}} onPageChange={() => {}} onNavigate={() => {}} onFieldSelect={() => {}} onFieldChange={() => {}} onFieldAdd={() => {}} onFieldDuplicate={() => {}} onFieldDelete={() => {}} onFieldMove={() => {}} />)

    expect(publicHtml).toContain('--public-button-width:360px')
    expect(publicHtml).toContain('--public-mobile-button-width:128px')
    expect(publicHtml).toContain('--public-mobile-button-x:0px')
    expect(editorHtml).toContain('--direct-button-width:128px')
    expect(editorHtml).toContain('--direct-button-x:0px')
  })

  it('keeps consent wording only on each consent question', () => {
    const html = renderToStaticMarkup(<FormCopyPanel project={emptyProject()} onChange={() => {}} />)

    expect(html).not.toContain('새 동의 항목의 기본 체크박스 문구')
    expect(html).not.toContain('consent-default-control')
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

  it('lets blank canvas clicks clear the active design selection', () => {
    const project = emptyProject()
    const html = renderToStaticMarkup(<InlineFormCanvas project={project} pageIndex={0} selectedFieldId={COVER_VIEW} onProjectChange={() => {}} onPageChange={() => {}} onNavigate={() => {}} onFieldSelect={() => {}} onFieldChange={() => {}} onFieldAdd={() => {}} onFieldDuplicate={() => {}} onFieldDelete={() => {}} onFieldMove={() => {}} />)

    expect(html).toContain('class="inline-form-canvas maker-editor-canvas')
    expect(html).toContain('제목 빠른 디자인')
  })

  it('renders customized copy, image placement, and transition choices', () => {
    const project = emptyProject()
    project.settings.coverKicker = 'HELLO'
    project.settings.startStatusLabel = '준비'
    project.settings.startLabel = '바로 참여'
    project.theme.coverUrl = 'https://example.com/cover.webp'
    project.theme.imageMode = 'banner'
    project.theme.transition = 'reveal'

    const html = renderToStaticMarkup(<FormCanvas project={project} pageIndex={0} preview />)

    expect(html).toContain('HELLO')
    expect(html).toContain('준비')
    expect(html).toContain('바로 참여')
    expect(html).toContain('form-media-banner')
    expect(html).toContain('transition-reveal')
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

  it('celebrates a public submission and offers an automatic close countdown', () => {
    const project = emptyProject()
    const html = renderToStaticMarkup(<FormCanvas project={project} submitted closeOnSuccess />)

    expect(html.match(/success-confetti-particle/g)).toHaveLength(30)
    expect(html).toContain('5초 뒤 자동으로 닫혀요.')
    expect(html).toContain('지금 닫기')
    expect(html).not.toContain('처음부터 보기')
  })

  it('renders every form color and marks the current selection', () => {
    const html = renderToStaticMarkup(<ProjectColorPicker value="mint" onChange={() => {}} />)

    expect(html.match(/project-color-dot/g)).toHaveLength(7)
    expect(html).toContain('민트 구분 색상')
    expect(html).toContain('aria-pressed="true"')
  })
})
