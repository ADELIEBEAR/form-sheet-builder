import { ArrowRight, CheckCircle, SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { fieldAnswerError } from '../lib/validation'
import FormField from './FormField'

export default function LandingFormEmbed({ project, preview = false }) {
  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('ready')
  const [message, setMessage] = useState('')
  const [startedAt, setStartedAt] = useState(Date.now())
  const fields = useMemo(() => (project?.pages || []).flatMap((page) => page.fields || []), [project])

  if (!project) return <div className="site-form-empty"><strong>연결된 폼이 없습니다</strong><p>사이트 편집기에서 신청받을 폼을 선택해 주세요.</p></div>

  function updateAnswer(field, value) {
    setAnswers((current) => ({ ...current, [field.id]: value }))
    if (!fieldAnswerError(field, value)) setErrors((current) => ({ ...current, [field.id]: '' }))
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
    <form className="site-embedded-form" onSubmit={submit} noValidate>
      {fields.map((field) => <FormField
        key={field.id}
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
      />)}
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
