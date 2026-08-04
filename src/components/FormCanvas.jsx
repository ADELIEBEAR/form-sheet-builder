import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import FormField from './FormField'

export default function FormCanvas({ project, pageIndex = 0, answers = {}, onAnswers, onPage, errors = {}, preview = false, selectedFieldId, onSelectField, submitted = false, submitting = false }) {
  const page = project.pages?.[pageIndex]
  if (!page) return null
  const style = {
    '--preview-accent': project.theme?.accent || '#2f6757',
    '--preview-bg': project.theme?.background || '#efede7',
    '--preview-card': project.theme?.card || '#fffdfa',
    '--preview-text': project.theme?.text || '#232724',
    '--preview-radius': `${project.theme?.radius ?? 14}px`,
  }

  if (submitted) return <div className="form-canvas success-canvas" style={style}><div className="success-symbol"><CheckCircle weight="fill" /></div><h1>{project.settings?.successTitle}</h1><p>{project.settings?.successMessage}</p></div>

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
