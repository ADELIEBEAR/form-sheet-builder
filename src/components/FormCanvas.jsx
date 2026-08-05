import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { FONT_STACKS, formSteps, resolvePageTypography } from '../lib/maker'
import FocusEffects from './FocusEffects'
import FormField from './FormField'
import FormMedia, { mediaMode, mediaVariables, transitionClass } from './FormMedia'

function canvasStyle(project, page = null) {
  const typography = resolvePageTypography(project, page)
  return {
    '--preview-accent': project.theme?.accent || '#7156d9',
    '--preview-bg': project.theme?.background || '#f0edfb',
    '--preview-card': project.theme?.card || '#ffffff',
    '--preview-text': project.theme?.text || '#222131',
    '--preview-radius': `${project.theme?.radius ?? 24}px`,
    '--preview-font': FONT_STACKS[project.theme?.font] || FONT_STACKS.pretendard,
    '--preview-title-size': `${typography.titleSize}px`,
    '--preview-question-size': `${typography.questionSize}px`,
    '--preview-body-size': `${typography.bodySize}px`,
    '--form-transition-duration': `${project.theme?.transitionSpeed ?? 440}ms`,
    ...mediaVariables(project.theme),
  }
}

function SuccessScreen({ project, style, focus, onRestart }) {
  const transition = transitionClass(project.theme)
  return (
    <div className={focus ? 'focus-form-canvas focus-success-canvas' : 'form-canvas success-canvas'} style={style}>
      {focus ? <FocusBackdrop project={project} /> : null}
      <div className={focus ? `focus-content-card focus-success-card ${transition}` : transition}>
        <FormMedia theme={project.theme} placement="card" className="focus-card-media" />
        <div className="success-symbol"><CheckCircle weight="fill" /></div>
        <h1>{project.settings?.successTitle}</h1>
        <p>{project.settings?.successMessage}</p>
        {onRestart && project.settings?.restartLabel !== '' ? <button className="focus-restart" type="button" onClick={onRestart}>{project.settings?.restartLabel ?? '처음부터 보기'}</button> : null}
      </div>
    </div>
  )
}

function FocusBackdrop({ project }) {
  return (
    <>
      <FormMedia theme={project.theme} placement="background" />
      <div className="focus-tint" />
      <FocusEffects theme={project.theme} />
    </>
  )
}

function FocusCanvas({ project, stepIndex, answers, onAnswers, onStep, onRestart, errors, preview, submitted, submitting }) {
  const steps = formSteps(project)
  const total = steps.length
  const isCover = stepIndex === 0
  const current = isCover ? null : steps[Math.min(Math.max(stepIndex - 1, 0), Math.max(total - 1, 0))]
  const style = canvasStyle(project, current?.page)

  if (submitted) return <SuccessScreen project={project} style={canvasStyle(project)} focus onRestart={onRestart} />

  const currentNumber = current ? Math.min(stepIndex, total) : 0
  const canContinue = total > 0
  const copy = project.settings || {}
  const transition = transitionClass(project.theme)
  const hasBanner = Boolean(project.theme?.coverUrl && mediaMode(project.theme) === 'banner')

  return (
    <div className="focus-form-canvas" style={style}>
      <FocusBackdrop project={project} />
      <div className={`focus-shell ${hasBanner ? 'has-banner' : ''}`}>
        <header className="focus-topbar">
          <button className="focus-brand-mark focus-brand-button" type="button" onClick={() => onStep?.(0)} aria-label="처음 화면으로"><i /><i /><i /></button>
          {project.theme?.showProgress !== false && !isCover ? <div className="focus-progress"><span style={{ width: `${(currentNumber / Math.max(total, 1)) * 100}%` }} /></div> : <span />}
          <small>{isCover ? (copy.startStatusLabel ?? '시작') : `${currentNumber} / ${total}`}</small>
        </header>

        <FormMedia theme={project.theme} placement="banner" className="focus-banner-media" />

        {isCover ? (
          <main className={`focus-cover-card focus-content-card ${transition}`} key="cover">
            <FormMedia theme={project.theme} placement="card" className="focus-card-media" />
            {copy.coverKicker !== '' ? <span className="focus-kicker">{copy.coverKicker ?? 'WELCOME'}</span> : null}
            <h1>{project.title}</h1>
            {project.description ? <p>{project.description}</p> : null}
            <button className="focus-primary" type="button" onClick={() => onStep?.(1)} disabled={preview || !canContinue} aria-label={copy.startLabel || '시작하기'}>{copy.startLabel ?? '시작하기'} <ArrowRight /></button>
          </main>
        ) : current ? (
          <main className={`focus-question-card focus-content-card ${transition}`} key={current.field.id}>
            <div className="focus-question-meta">
              <span>{current.page.title || `페이지 ${current.pageIndex + 1}`}</span>
              {current.field.required && copy.requiredLabel !== '' ? <small>{copy.requiredLabel ?? '필수'}</small> : null}
            </div>
            <FormField
              field={current.field}
              value={answers[current.field.id]}
              onChange={(value) => onAnswers?.({ ...answers, [current.field.id]: value })}
              error={errors[current.field.id]}
              preview={preview}
              accent={project.theme?.accent}
              requiredLabel={copy.requiredLabel ?? '필수'}
              answerPlaceholder={copy.answerPlaceholder ?? '답변을 입력해 주세요'}
              selectPlaceholder={copy.selectPlaceholder ?? '선택해 주세요'}
              consentLabel={copy.consentLabel ?? '내용을 확인했으며 동의합니다.'}
            />
            <footer className="focus-actions">
              <button className="focus-back" type="button" onClick={() => onStep?.(Math.max(0, stepIndex - 1))} aria-label={copy.previousLabel || '이전'}><ArrowLeft /></button>
              {stepIndex < total ? (
                <button className="focus-primary" type="button" onClick={() => onStep?.(stepIndex + 1)} disabled={preview} aria-label={copy.nextLabel || '다음'}>{copy.nextLabel ?? '다음'} <ArrowRight /></button>
              ) : (
                <button className="focus-primary" type="submit" disabled={preview || submitting} aria-label={copy.submitLabel || '제출하기'}>{submitting ? (copy.submitPendingLabel ?? '저장 중') : (copy.submitLabel ?? '제출하기')}</button>
              )}
            </footer>
          </main>
        ) : null}
      </div>
    </div>
  )
}

function CardCanvas({ project, pageIndex, answers, onAnswers, onPage, onRestart, errors, preview, selectedFieldId, onSelectField, submitted, submitting }) {
  const page = project.pages?.[pageIndex]
  if (!page) return null
  const style = canvasStyle(project, page)
  const copy = project.settings || {}
  const transition = transitionClass(project.theme)

  if (submitted) return <SuccessScreen project={project} style={style} onRestart={onRestart} />

  return (
    <div className="form-canvas" style={style}>
      <FormMedia theme={project.theme} placement="background" />
      <FormMedia theme={project.theme} placement="banner" className="canvas-banner-media" />
      <div className={`canvas-content ${transition}`} key={page.id}>
        <FormMedia theme={project.theme} placement="card" className="canvas-card-media" />
        {project.theme?.showProgress && project.pages.length > 1 ? <div className="page-progress"><span style={{ width: `${((pageIndex + 1) / project.pages.length) * 100}%` }} /></div> : null}
        <header className="canvas-intro">
          {pageIndex === 0 ? <><h1>{project.title}</h1>{project.description ? <p>{project.description}</p> : null}</> : null}
          {project.pages.length > 1 ? <div className="page-copy"><small>{pageIndex + 1} / {project.pages.length}</small><h2>{page.title}</h2>{page.description ? <p>{page.description}</p> : null}</div> : null}
        </header>
        <div className="canvas-fields">
          {page.fields.map((field) => preview ? (
            <div
              className={`canvas-field-select ${selectedFieldId === field.id ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              key={field.id}
              onClick={() => onSelectField?.(field.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectField?.(field.id)
                }
              }}
            >
              <FormField field={field} value={answers[field.id]} preview accent={project.theme?.accent} requiredLabel={copy.requiredLabel ?? '필수'} answerPlaceholder={copy.answerPlaceholder ?? '답변을 입력해 주세요'} selectPlaceholder={copy.selectPlaceholder ?? '선택해 주세요'} consentLabel={copy.consentLabel ?? '내용을 확인했으며 동의합니다.'} />
            </div>
          ) : <FormField key={field.id} field={field} value={answers[field.id]} onChange={(value) => onAnswers?.({ ...answers, [field.id]: value })} error={errors[field.id]} accent={project.theme?.accent} requiredLabel={copy.requiredLabel ?? '필수'} answerPlaceholder={copy.answerPlaceholder ?? '답변을 입력해 주세요'} selectPlaceholder={copy.selectPlaceholder ?? '선택해 주세요'} consentLabel={copy.consentLabel ?? '내용을 확인했으며 동의합니다.'} />)}
        </div>
        <footer className="canvas-actions">
          {pageIndex > 0 ? <button className="canvas-secondary" type="button" onClick={() => onPage?.(pageIndex - 1)} aria-label={copy.previousLabel || '이전'}><ArrowLeft /> {copy.previousLabel ?? '이전'}</button> : <span />}
          {pageIndex < project.pages.length - 1 ? <button className="canvas-primary" type="button" onClick={() => onPage?.(pageIndex + 1)} aria-label={copy.nextLabel || '다음'}>{copy.nextLabel ?? '다음'} <ArrowRight /></button> : <button className="canvas-primary" type="submit" disabled={preview || submitting} aria-label={copy.submitLabel || '제출하기'}>{submitting ? (copy.submitPendingLabel ?? '저장 중') : (copy.submitLabel ?? '제출하기')}</button>}
        </footer>
      </div>
    </div>
  )
}

export default function FormCanvas(props) {
  const safeProps = {
    ...props,
    pageIndex: props.pageIndex ?? 0,
    answers: props.answers || {},
    errors: props.errors || {},
  }
  const focus = (safeProps.project.theme?.layout || 'focus') === 'focus'
  if (focus) {
    return (
      <FocusCanvas
        project={safeProps.project}
        stepIndex={safeProps.pageIndex}
        answers={safeProps.answers}
        onAnswers={safeProps.onAnswers}
        onStep={safeProps.onPage}
        onRestart={safeProps.onRestart}
        errors={safeProps.errors}
        preview={safeProps.preview}
        submitted={safeProps.submitted}
        submitting={safeProps.submitting}
      />
    )
  }
  return <CardCanvas {...safeProps} />
}
