import { ArrowDown, ArrowRight, ArrowUp, CheckCircle, DotsSixVertical, SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { orderedSiteFormFields } from '../lib/siteMaker'
import { fieldAnswerError } from '../lib/validation'
import FormField from './FormField'

export default function LandingFormEmbed({ project, preview = false, mobile = false, settings = {}, onFieldOrderChange, onFieldStyleChange }) {
  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('ready')
  const [message, setMessage] = useState('')
  const [startedAt, setStartedAt] = useState(Date.now())
  const [dragFieldId, setDragFieldId] = useState('')
  const [activeFieldId, setActiveFieldId] = useState('')
  const [draftFieldStyles, setDraftFieldStyles] = useState({})
  const fields = useMemo(() => orderedSiteFormFields(project, settings.fieldOrder), [project, settings.fieldOrder])

  if (!project) return <div className="site-form-empty"><strong>연결된 폼이 없습니다</strong><p>사이트 편집기에서 신청받을 폼을 선택해 주세요.</p></div>

  function updateAnswer(field, value) {
    setAnswers((current) => ({ ...current, [field.id]: value }))
    if (!fieldAnswerError(field, value)) setErrors((current) => ({ ...current, [field.id]: '' }))
  }

  function applyOrder(nextFields) {
    onFieldOrderChange?.(nextFields.map((field) => field.id))
  }

  function moveField(fieldId, direction) {
    const index = fields.findIndex((field) => field.id === fieldId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= fields.length) return
    const next = [...fields]
    const [field] = next.splice(index, 1)
    next.splice(target, 0, field)
    applyOrder(next)
  }

  function dropField(targetId) {
    const from = fields.findIndex((field) => field.id === dragFieldId)
    const to = fields.findIndex((field) => field.id === targetId)
    setDragFieldId('')
    if (from < 0 || to < 0 || from === to) return
    const next = [...fields]
    const [field] = next.splice(from, 1)
    next.splice(to, 0, field)
    applyOrder(next)
  }

  function fieldStyle(fieldId) {
    const saved = settings.fieldStyles?.[fieldId] || {}
    const draft = draftFieldStyles[fieldId] || {}
    return {
      width: Number(draft.width ?? (mobile ? saved.mobileWidth : saved.width) ?? 100),
      scale: Number(draft.scale ?? (mobile ? saved.mobileScale : saved.scale) ?? 100),
    }
  }

  function startFieldResize(event, fieldId, kind) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    setActiveFieldId(fieldId)
    const startX = event.clientX
    const startY = event.clientY
    const start = fieldStyle(fieldId)
    const resizeClass = `site-field-resizing-${kind}`
    const formWidth = event.currentTarget.closest('.site-embedded-form')?.getBoundingClientRect().width || 1
    let latest = start
    const move = (moveEvent) => {
      if (kind === 'width') {
        const width = Math.max(42, Math.min(100, Math.round((start.width + ((moveEvent.clientX - startX) / formWidth) * 100) / 2) * 2))
        latest = { ...start, width }
      } else {
        const distance = ((moveEvent.clientX - startX) + (moveEvent.clientY - startY)) / 2
        const scale = Math.max(70, Math.min(145, Math.round((start.scale + distance * .55) / 5) * 5))
        latest = { ...start, scale }
      }
      setDraftFieldStyles((current) => ({ ...current, [fieldId]: latest }))
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.body.classList.remove(resizeClass)
      setDraftFieldStyles((current) => {
        const next = { ...current }
        delete next[fieldId]
        return next
      })
      if (latest.width !== start.width || latest.scale !== start.scale) {
        const saved = settings.fieldStyles?.[fieldId] || {}
        onFieldStyleChange?.(fieldId, mobile
          ? { ...saved, mobileWidth: latest.width, mobileScale: latest.scale }
          : { ...saved, width: latest.width, scale: latest.scale })
      }
    }
    document.body.classList.add(resizeClass)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  async function submit(event) {
    event.preventDefault()
    if (preview) return
    const nextErrors = Object.fromEntries(fields.map((field) => [field.id, fieldAnswerError(field, answers[field.id])]).filter(([, error]) => error))
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setStatus('submitting')
    setMessage('')
    try {
      await api(`/maker/public/${encodeURIComponent(project.slug)}/submissions`, {
        method: 'POST',
        body: { answers, website: event.currentTarget.website.value, startedAt },
      })
      setStatus('success')
    } catch (caught) {
      setMessage(caught.message)
      setStatus('ready')
    }
  }

  if (status === 'success') return (
    <div className="site-form-success" role="status">
      <CheckCircle weight="fill" />
      <h3>{project.settings?.successTitle || '신청이 접수되었습니다'}</h3>
      <p>{project.settings?.successMessage || '확인 후 안내드리겠습니다.'}</p>
      <button type="button" onClick={() => { setAnswers({}); setErrors({}); setStartedAt(Date.now()); setStatus('ready') }}>다시 작성하기</button>
    </div>
  )

  return (
    <form
      className={`site-embedded-form ${preview ? 'is-order-editing' : ''}`}
      style={{
        '--landing-question-size': `${settings.questionSize || 20}px`,
        '--landing-description-size': `${settings.descriptionSize || 13}px`,
        '--landing-input-size': `${settings.inputSize || 15}px`,
        '--landing-input-height': `${settings.inputHeight || 48}px`,
        '--landing-field-spacing': `${settings.fieldSpacing ?? 16}px`,
      }}
      onSubmit={submit}
      noValidate
    >
      {fields.map((field, index) => {
        const size = fieldStyle(field.id)
        const savedSize = settings.fieldStyles?.[field.id] || {}
        const active = activeFieldId === field.id
        return <div
          className={`site-embedded-field ${preview ? 'is-editable' : ''} ${active ? 'is-size-selected' : ''} ${dragFieldId === field.id ? 'is-dragging' : ''}`}
          key={field.id}
          style={{
            '--landing-item-width': `${mobile ? (savedSize.width ?? 100) : size.width}%`,
            '--landing-item-scale': (mobile ? (savedSize.scale ?? 100) : size.scale) / 100,
            '--landing-item-mobile-width': `${mobile ? size.width : (savedSize.mobileWidth ?? 100)}%`,
            '--landing-item-mobile-scale': (mobile ? size.scale : (savedSize.mobileScale ?? 100)) / 100,
          }}
          onClick={preview ? () => setActiveFieldId(field.id) : undefined}
          onDragOver={preview ? (event) => event.preventDefault() : undefined}
          onDrop={preview ? (event) => { event.preventDefault(); event.stopPropagation(); dropField(field.id) } : undefined}
        >
        {preview ? <div className="site-field-order-tools" role="toolbar" aria-label={`${field.label || '문항'} 순서`} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="site-field-drag-handle" draggable onDragStart={(event) => { event.stopPropagation(); setDragFieldId(field.id); event.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setDragFieldId('')} title="끌어서 문항 순서 변경" aria-label={`${field.label || '문항'} 끌어서 이동`}><DotsSixVertical weight="bold" /></button>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <button type="button" onClick={() => moveField(field.id, -1)} disabled={index === 0} title="위로 이동" aria-label={`${field.label || '문항'} 위로 이동`}><ArrowUp /></button>
          <button type="button" onClick={() => moveField(field.id, 1)} disabled={index === fields.length - 1} title="아래로 이동" aria-label={`${field.label || '문항'} 아래로 이동`}><ArrowDown /></button>
        </div> : null}
        {preview ? <>
          <span className="site-field-size-badge">{mobile ? '모바일 ' : ''}폭 {size.width}% · 크기 {size.scale}%</span>
          <button className="site-field-width-handle" type="button" onPointerDown={(event) => startFieldResize(event, field.id, 'width')} aria-label={`${field.label || '문항'} 폭 드래그 조절`} title="좌우로 드래그해 문항 폭 조절" />
          <button className="site-field-scale-handle" type="button" onPointerDown={(event) => startFieldResize(event, field.id, 'scale')} aria-label={`${field.label || '문항'} 크기 드래그 조절`} title="대각선으로 드래그해 문항 전체 크기 조절" />
        </> : null}
        <FormField
          field={field}
          value={answers[field.id]}
          onChange={(value) => updateAnswer(field, value)}
          error={errors[field.id]}
          preview={preview}
          accent={project.theme?.accent}
          requiredLabel={project.settings?.requiredLabel || '필수'}
          answerPlaceholder={project.settings?.answerPlaceholder || '답변을 입력해 주세요'}
          selectPlaceholder={project.settings?.selectPlaceholder || '선택해 주세요'}
          consentLabel={project.settings?.consentLabel || '내용을 확인했으며 동의합니다.'}
        />
      </div>})}
      <label className="honeypot" aria-hidden="true" hidden>웹사이트<input name="website" tabIndex="-1" autoComplete="off" /></label>
      {message ? <p className="site-form-error"><WarningCircle weight="fill" />{message}</p> : null}
      <button className="site-submit-button" type="submit" disabled={preview || status === 'submitting'}>
        {status === 'submitting' ? <SpinnerGap className="spin" /> : null}
        {status === 'submitting' ? (project.settings?.submitPendingLabel || '보내는 중') : (project.settings?.submitLabel || '신청서 보내기')}
        {status !== 'submitting' ? <ArrowRight weight="bold" /> : null}
      </button>
    </form>
  )
}
