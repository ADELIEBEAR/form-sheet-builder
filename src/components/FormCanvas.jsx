import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { FONT_STACKS } from '../lib/maker'
import FormField from './FormField'

function canvasStyle(project) {
  return {
    '--preview-accent': project.theme?.accent || '#7156d9',
    '--preview-bg': project.theme?.background || '#f0edfb',
    '--preview-card': project.theme?.card || '#ffffff',
    '--preview-text': project.theme?.text || '#222131',
    '--preview-radius': `${project.theme?.radius ?? 24}px`,
    '--preview-font': FONT_STACKS[project.theme?.font] || FONT_STACKS.pretendard,
  }
}

function SuccessScreen({ project, style, focus }) {
  return (
    <div className={focus ? 'focus-form-canvas focus-success-canvas' : 'form-canvas success-canvas'} style={style}>
      {focus ? <FocusBackdrop project={project} /> : null}
      <div className={focus ? 'focus-content-card focus-success-card' : ''}>
        <div className="success-symbol"><CheckCircle weight="fill" /></div>
        <h1>{project.settings?.successTitle}</h1>
        <p>{project.settings?.successMessage}</p>
      </div>
    </div>
  )
}

function FocusBackdrop({ project }) {
  return (
    <>
      {project.theme?.coverUrl ? <div className="focus-image" style={{ backgroundImage: `url("${project.theme.coverUrl}")` }} /> : null}
      <div className="focus-tint" />
    </>
  )
}

function FocusCanvas({ project, stepIndex, answers, onAnswers, onStep, errors, preview, submitted, submitting }) {
  const steps = project.pages.flatMap((page, pageIndex) => (page.fields || []).map((field) => ({ field, page, pageIndex })))
  const total = steps.length
  const style = canvasStyle(project)

  if (submitted) return <SuccessScreen project={project} style={style} focus />

  const isCover = stepIndex === 0
  const current = isCover ? null : steps[Math.min(Math.max(stepIndex - 1, 0), Math.max(total - 1, 0))]
  const currentNumber = current ? Math.min(stepIndex, total) : 0
  const canContinue = total > 0

  return (
    <div className="focus-form-canvas" style={style}>
      <FocusBackdrop project={project} />
      <div className="focus-shell">
        <header className="focus-topbar">
          <span className="focus-brand-mark"><i /><i /><i /></span>
          {project.theme?.showProgress !== false && !isCover ? <div className="focus-progress"><span style={{ width: `${(currentNumber / Math.max(total, 1)) * 100}%` }} /></div> : <span />}
          <small>{isCover ? 'FORM' : `${currentNumber} / ${total}`}</small>
        </header>

        {isCover ? (
          <main className="focus-cover-card focus-content-card">
            <span className="focus-kicker">WELCOME</span>
            <h1>{project.title}</h1>
            {project.description ? <p>{project.description}</p> : null}
            <button className="focus-primary" type="button" onClick={() => onStep?.(1)} disabled={preview || !canContinue}>시작하기 <ArrowRight /></button>
          </main>
        ) : current ? (
          <main className="focus-question-card focus-content-card">
            <div className="focus-question-meta">
              <span>{current.page.title || `페이지 ${current.pageIndex + 1}`}</span>
              {current.field.required ? <small>필수</small> : null}
            </div>
            <FormField
              field={current.field}
              value={answers[current.field.id]}
              onChange={(value) => onAnswers?.({ ...answers, [current.field.id]: value })}
              error={errors[current.field.id]}
              preview={preview}
              accent={project.theme?.accent}
            />
            <footer className="focus-actions">
              <button className="focus-back" type="button" onClick={() => onStep?.(Math.max(0, stepIndex - 1))} aria-label="이전"><ArrowLeft /></button>
              {stepIndex < total ? (
                <button className="focus-primary" type="button" onClick={() => onStep?.(stepIndex + 1)} disabled={preview}>다음 <ArrowRight /></button>
              ) : (
                <button className="focus-primary" type="submit" disabled={preview || submitting}>{submitting ? '저장 중' : project.settings?.submitLabel || '제출하기'}</button>
              )}
            </footer>
          </main>
        ) : null}
      </div>
    </div>
  )
}

function CardCanvas({ project, pageIndex, answers, onAnswers, onPage, errors, preview, selectedFieldId, onSelectField, submitted, submitting }) {
  const page = project.pages?.[pageIndex]
  if (!page) return null
  const style = canvasStyle(project)

  if (submitted) return <SuccessScreen project={project} style={style} />

  return (
    <div className="form-canvas" style={style}>
      {project.theme?.coverUrl ? <img className="canvas-cover" src={project.theme.coverUrl} alt="" /> : null}
      <div className="canvas-content">
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
              <FormField field={field} value={answers[field.id]} preview accent={project.theme?.accent} />
            </div>
          ) : <FormField key={field.id} field={field} value={answers[field.id]} onChange={(value) => onAnswers?.({ ...answers, [field.id]: value })} error={errors[field.id]} accent={project.theme?.accent} />)}
        </div>
        <footer className="canvas-actions">
          {pageIndex > 0 ? <button className="canvas-secondary" type="button" onClick={() => onPage?.(pageIndex - 1)}><ArrowLeft /> 이전</button> : <span />}
          {pageIndex < project.pages.length - 1 ? <button className="canvas-primary" type="button" onClick={() => onPage?.(pageIndex + 1)}>다음 <ArrowRight /></button> : <button className="canvas-primary" type="submit" disabled={preview || submitting}>{submitting ? '저장 중' : project.settings?.submitLabel || '제출하기'}</button>}
        </footer>
      </div>
    </div>
  )
}

export default function FormCanvas(props) {
  const focus = (props.project.theme?.layout || 'focus') === 'focus'
  if (focus) {
    return (
      <FocusCanvas
        project={props.project}
        stepIndex={props.pageIndex}
        answers={props.answers}
        onAnswers={props.onAnswers}
        onStep={props.onPage}
        errors={props.errors}
        preview={props.preview}
        submitted={props.submitted}
        submitting={props.submitting}
      />
    )
  }
  return <CardCanvas {...props} />
}
