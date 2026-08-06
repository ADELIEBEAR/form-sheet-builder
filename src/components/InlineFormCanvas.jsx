import { ArrowLeft, ArrowRight, CheckCircle, Plus, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { FIELD_GROUPS, FONT_STACKS, TYPE_LABEL, formSteps, resolveDirectTextStyle, resolvePageTypography } from '../lib/maker'
import DirectCanvasButton from './DirectCanvasButton'
import DirectCanvasText from './DirectCanvasText'
import BrandMark from './BrandMark'
import { CompletionCelebration } from './FormCanvas'
import FocusEffects from './FocusEffects'
import FormMedia, { mediaMode, mediaVariables, transitionClass } from './FormMedia'
import InlineFieldEditor from './InlineFieldEditor'

export const COVER_VIEW = '__cover__'
export const SUCCESS_VIEW = '__success__'

export default function InlineFormCanvas({ project, pageIndex, selectedFieldId, onProjectChange, onPageChange, onNavigate, onFieldSelect, onFieldChange, onFieldAdd, onFieldDuplicate, onFieldDelete, onFieldMove, snapToGrid = false, device = 'desktop' }) {
  const [adding, setAdding] = useState(false)
  const [activeText, setActiveText] = useState('coverTitle')
  const page = project.pages[pageIndex]
  useEffect(() => {
    setActiveText(selectedFieldId === COVER_VIEW ? 'coverTitle' : selectedFieldId === SUCCESS_VIEW ? 'successTitle' : 'question')
  }, [selectedFieldId])
  if (!page) return null

  const selectedIndex = page.fields.findIndex((field) => field.id === selectedFieldId)
  const selectedField = selectedIndex >= 0 ? page.fields[selectedIndex] : null
  const isCover = selectedFieldId === COVER_VIEW
  const isSuccess = selectedFieldId === SUCCESS_VIEW
  const typography = resolvePageTypography(project, isCover || isSuccess ? null : page)
  const mobilePreview = device === 'mobile'
  const steps = formSteps(project)
  const copy = project.settings || {}
  const transition = transitionClass(project.theme)
  const hasBanner = Boolean(project.theme?.coverUrl && mediaMode(project.theme) === 'banner')
  const globalIndex = steps.findIndex(({ field }) => field.id === selectedFieldId)
  const navigateToStep = (nextIndex) => {
    if (nextIndex < 0) {
      onNavigate?.(0, COVER_VIEW)
      return
    }
    if (nextIndex >= steps.length) {
      onNavigate?.(Math.max(project.pages.length - 1, 0), SUCCESS_VIEW)
      return
    }
    const next = steps[nextIndex]
    onNavigate?.(next.pageIndex, next.field.id)
  }
  const style = {
    '--preview-accent': project.theme?.accent || '#7156d9',
    '--preview-bg': project.theme?.background || '#f0edfb',
    '--preview-card': project.theme?.card || '#ffffff',
    '--preview-text': project.theme?.text || '#222131',
    '--preview-radius': `${project.theme?.radius ?? 24}px`,
    '--preview-font': FONT_STACKS[project.theme?.font] || FONT_STACKS.pretendard,
    '--preview-title-size': `${typography.titleSize}px`,
    '--preview-question-size': `${typography.questionSize}px`,
    '--preview-body-size': `${typography.bodySize}px`,
    '--preview-title-weight': typography.titleWeight,
    '--preview-question-weight': typography.questionWeight,
    '--preview-body-weight': typography.bodyWeight,
    '--preview-title-line': typography.titleLineHeight / 100,
    '--preview-question-line': typography.questionLineHeight / 100,
    '--preview-body-line': typography.bodyLineHeight / 100,
    '--preview-title-tracking': `${typography.titleTracking / 100}em`,
    '--preview-question-tracking': `${typography.questionTracking / 100}em`,
    '--preview-body-tracking': `${typography.bodyTracking / 100}em`,
    '--preview-text-align': typography.textAlign,
    '--form-transition-duration': `${project.theme?.transitionSpeed ?? 440}ms`,
    ...mediaVariables(project.theme),
  }
  const add = (type) => {
    onFieldAdd(type)
    setAdding(false)
  }
  const directStyles = project.theme?.directStyles || {}
  const coverTitleBase = { font: project.theme?.font, size: typography.titleSize, align: typography.textAlign }
  const coverBodyBase = { font: project.theme?.font, size: typography.bodySize, align: typography.textAlign }
  const successTitleBase = { font: project.theme?.font, size: Math.min(typography.titleSize, 48), align: 'center' }
  const successBodyBase = { font: project.theme?.font, size: typography.bodySize, align: 'center' }
  const directValue = (key) => directStyles[mobilePreview ? `${key}Mobile` : key]
  const directFallback = (key, base) => mobilePreview ? resolveDirectTextStyle(directStyles[key], base) : base
  const directKey = (key) => mobilePreview ? `${key}Mobile` : key
  const patchThemeText = (key, next) => onProjectChange({
    ...project,
    theme: { ...project.theme, directStyles: { ...directStyles, [key]: next } },
  })
  const buttonStyles = project.theme?.buttonStyles || {}
  const buttonValue = (key) => buttonStyles[mobilePreview ? `${key}Mobile` : key]
  const buttonFallback = (_key, base) => base
  const buttonKey = (key) => mobilePreview ? `${key}Mobile` : key
  const patchThemeButton = (key, next) => onProjectChange({
    ...project,
    theme: { ...project.theme, buttonStyles: { ...buttonStyles, [key]: next } },
  })
  const clearCanvasSelection = (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('.direct-canvas-text, .direct-canvas-button, input, textarea, select, button, a, label, [role="toolbar"]')) return
    setActiveText('')
  }

  return (
    <div className={`inline-form-canvas maker-editor-canvas ${snapToGrid ? 'snap-grid-active' : ''} ${mobilePreview ? 'mobile-canvas-editing' : ''}`} style={style} onPointerDown={clearCanvasSelection}>
      <FormMedia theme={project.theme} placement="background" />
      <div className="focus-tint" />
      <FocusEffects theme={project.theme} />
      <div className={`focus-shell studio-focus-shell ${hasBanner ? 'has-banner' : ''}`}>
        <header className="focus-topbar">
          <button className="focus-brand-mark focus-brand-button" type="button" onClick={() => onNavigate?.(0, COVER_VIEW)} aria-label="시작 화면으로"><BrandMark /></button>
          {project.theme?.showProgress !== false ? <div className="focus-progress"><span style={{ width: isCover ? '0%' : isSuccess ? '100%' : `${((globalIndex + 1) / Math.max(steps.length, 1)) * 100}%` }} /></div> : <span />}
          <small>{isCover ? (copy.startStatusLabel ?? '시작') : isSuccess ? (copy.completeStatusLabel ?? '완료') : `${globalIndex + 1} / ${steps.length}`}</small>
        </header>

        <FormMedia theme={project.theme} placement="banner" className="focus-banner-media" />

        {isCover ? (
          <main className={`focus-content-card focus-cover-card studio-cover-editor ${transition}`} key="studio-cover">
            <FormMedia theme={project.theme} placement="card" className="focus-card-media" />
            <input className="focus-editor-kicker" value={copy.coverKicker ?? 'WELCOME'} onChange={(event) => onProjectChange({ ...project, settings: { ...copy, coverKicker: event.target.value } })} aria-label="시작 화면 작은 문구" placeholder="작은 문구" />
            <DirectCanvasText className="direct-cover-title" label="제목" value={directValue('coverTitle')} fallback={directFallback('coverTitle', coverTitleBase)} minSize={28} maxSize={mobilePreview ? 48 : 96} selected={activeText === 'coverTitle'} onSelect={() => setActiveText('coverTitle')} onChange={(next) => patchThemeText(directKey('coverTitle'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
              <textarea className="focus-editor-title" rows="1" value={project.title} onChange={(event) => onProjectChange({ ...project, title: event.target.value })} aria-label="폼 제목" placeholder="폼 제목을 입력하세요" />
            </DirectCanvasText>
            <DirectCanvasText className="direct-cover-body" label="설명" value={directValue('coverBody')} fallback={directFallback('coverBody', coverBodyBase)} minSize={12} maxSize={mobilePreview ? 22 : 40} selected={activeText === 'coverBody'} onSelect={() => setActiveText('coverBody')} onChange={(next) => patchThemeText(directKey('coverBody'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
              <textarea className="focus-editor-description" rows="2" value={project.description || ''} onChange={(event) => onProjectChange({ ...project, description: event.target.value })} aria-label="폼 설명" placeholder="응답자에게 보여줄 안내를 입력하세요" />
            </DirectCanvasText>
            <DirectCanvasButton className="direct-start-button" label="시작 버튼" value={buttonValue('start')} fallback={buttonFallback('start', { width: 128 })} minWidth={112} maxWidth={mobilePreview ? 280 : 360} selected={activeText === 'startButton'} onSelect={() => setActiveText('startButton')} onChange={(next) => patchThemeButton(buttonKey('start'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
              <button className="focus-primary" type="button" onClick={() => navigateToStep(0)} disabled={!steps.length} aria-label={copy.startLabel || '시작하기'}>{copy.startLabel ?? '시작하기'} <ArrowRight /></button>
            </DirectCanvasButton>
          </main>
        ) : null}

        {isSuccess ? (
          <main className={`focus-content-card focus-success-card studio-success-editor ${transition}`} key="studio-success">
            <CompletionCelebration />
            <FormMedia theme={project.theme} placement="card" className="focus-card-media" />
            <div className="success-symbol"><CheckCircle weight="fill" /></div>
            <DirectCanvasText className="direct-success-title" label="완료 제목" value={directValue('successTitle')} fallback={directFallback('successTitle', successTitleBase)} minSize={28} maxSize={mobilePreview ? 48 : 72} selected={activeText === 'successTitle'} onSelect={() => setActiveText('successTitle')} onChange={(next) => patchThemeText(directKey('successTitle'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
              <textarea className="focus-editor-success-title" rows="1" value={project.settings.successTitle} onChange={(event) => onProjectChange({ ...project, settings: { ...project.settings, successTitle: event.target.value } })} aria-label="제출 완료 제목" />
            </DirectCanvasText>
            <DirectCanvasText className="direct-success-body" label="완료 설명" value={directValue('successBody')} fallback={directFallback('successBody', successBodyBase)} minSize={12} maxSize={mobilePreview ? 22 : 32} selected={activeText === 'successBody'} onSelect={() => setActiveText('successBody')} onChange={(next) => patchThemeText(directKey('successBody'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
              <textarea className="focus-editor-description" rows="2" value={project.settings.successMessage} onChange={(event) => onProjectChange({ ...project, settings: { ...project.settings, successMessage: event.target.value } })} aria-label="제출 완료 안내" />
            </DirectCanvasText>
            <DirectCanvasButton className="direct-restart-button" label="다시 보기 버튼" value={buttonValue('restart')} fallback={buttonFallback('restart', { width: 140 })} minWidth={112} maxWidth={mobilePreview ? 280 : 360} selected={activeText === 'restartButton'} onSelect={() => setActiveText('restartButton')} onChange={(next) => patchThemeButton(buttonKey('restart'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
              <button className="focus-restart" type="button" onClick={() => onNavigate?.(0, COVER_VIEW)} aria-label={copy.restartLabel || '처음부터 보기'}>{copy.restartLabel ?? '처음부터 보기'}</button>
            </DirectCanvasButton>
          </main>
        ) : null}

        {!isCover && !isSuccess ? (
          <main className={`focus-content-card studio-question-editor ${transition}`} key={selectedFieldId}>
            <div className="studio-page-meta">
              <span>{copy.pageLabel ?? 'PAGE'} {pageIndex + 1}</span>
              <input value={page.title || ''} onChange={(event) => onPageChange({ ...page, title: event.target.value })} aria-label="페이지 제목" placeholder={`페이지 ${pageIndex + 1}`} />
              <textarea rows="1" value={page.description || ''} onChange={(event) => onPageChange({ ...page, description: event.target.value })} aria-label="페이지 설명" placeholder="페이지 안내는 선택 사항입니다" />
            </div>
            {selectedField ? (
              <InlineFieldEditor
                field={selectedField}
                index={selectedIndex}
                total={page.fields.length}
                selected
                accent={project.theme?.accent}
                requiredLabel={copy.requiredLabel ?? '필수'}
                answerPlaceholder={copy.answerPlaceholder ?? '답변을 입력해 주세요'}
                selectPlaceholder={copy.selectPlaceholder ?? '선택해 주세요'}
                consentLabel={copy.consentLabel ?? '내용을 확인했으며 동의합니다.'}
                onSelect={() => onFieldSelect(selectedField.id)}
                onChange={(next) => onFieldChange(selectedField.id, next)}
                onDuplicate={() => onFieldDuplicate(selectedField.id)}
                onDelete={() => onFieldDelete(selectedField.id)}
                onMove={(direction) => onFieldMove(selectedField.id, direction)}
                directStyles={selectedField.directStyles}
                directFallbacks={{
                  question: { font: project.theme?.font, size: typography.questionSize, align: typography.textAlign },
                  body: { font: project.theme?.font, size: typography.bodySize, align: typography.textAlign },
                }}
                activeTextRole={activeText}
                onTextRoleSelect={setActiveText}
                onDirectStyleChange={(role, next) => onFieldChange(selectedField.id, { ...selectedField, directStyles: { ...(selectedField.directStyles || {}), [role]: next } })}
                snapToGrid={snapToGrid}
                device={device}
              />
            ) : <div className="studio-no-question"><strong>이 페이지가 비어 있습니다</strong><p>아래에서 첫 질문을 추가하세요.</p></div>}
            {selectedField ? <footer className="focus-actions studio-flow-actions">
              <DirectCanvasButton className="direct-back-button" label="이전 버튼" value={buttonValue('back')} fallback={buttonFallback('back', { width: 48 })} minWidth={40} maxWidth={mobilePreview ? 160 : 180} selected={activeText === 'backButton'} onSelect={() => setActiveText('backButton')} onChange={(next) => patchThemeButton(buttonKey('back'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
                <button className="focus-back" type="button" onClick={() => navigateToStep(globalIndex - 1)} aria-label={copy.previousLabel || '이전'}><ArrowLeft /></button>
              </DirectCanvasButton>
              <DirectCanvasButton className="direct-primary-button" label={globalIndex < steps.length - 1 ? '다음 버튼' : '제출 버튼'} value={buttonValue('primary')} fallback={buttonFallback('primary', { width: 128 })} minWidth={112} maxWidth={mobilePreview ? 280 : 360} selected={activeText === 'primaryButton'} onSelect={() => setActiveText('primaryButton')} onChange={(next) => patchThemeButton(buttonKey('primary'), next)} snapToGrid={snapToGrid} mobile={mobilePreview}>
                <button className="focus-primary" type="button" onClick={() => navigateToStep(globalIndex + 1)} aria-label={globalIndex < steps.length - 1 ? (copy.nextLabel || '다음') : (copy.submitLabel || '제출하기')}>{globalIndex < steps.length - 1 ? <>{copy.nextLabel ?? '다음'} <ArrowRight /></> : (copy.submitLabel ?? '제출하기')}</button>
              </DirectCanvasButton>
            </footer> : null}
            <div className={`inline-add-field ${adding ? 'open' : ''}`}>
              <button className="inline-add-trigger" type="button" onClick={() => setAdding((current) => !current)}>{adding ? <X /> : <Plus />}{adding ? '닫기' : '질문 추가'}</button>
              {adding ? <div className="inline-add-menu">{FIELD_GROUPS.map((group) => <div key={group.label}><span>{group.label}</span><div>{group.types.map((type) => <button type="button" key={type} onClick={() => add(type)}><Plus /> {TYPE_LABEL[type]}</button>)}</div></div>)}</div> : null}
            </div>
          </main>
        ) : null}
      </div>
    </div>
  )
}
