import { CheckCircle, SpinnerGap, SquaresFour, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from '../lib/router'
import PublicFields from '../components/PublicFields'
import { api } from '../lib/api'

export default function PublicForm() {
  const { slug } = useParams()
  const [form, setForm] = useState(null)
  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [startedAt] = useState(Date.now())

  useEffect(() => {
    api(`/api/public/forms/${encodeURIComponent(slug)}`).then((data) => { setForm(data.form); setStatus('ready') }).catch((caught) => { setMessage(caught.message); setStatus('error') })
  }, [slug])

  const pageStyle = useMemo(() => form ? { '--form-accent': form.theme?.accent || '#0f766e', '--form-surface': form.theme?.surface || '#f3f7f6' } : {}, [form])

  function validate() {
    const next = {}
    form.questions.forEach((question) => {
      if (question.type === 'notice' || !question.required) return
      const value = answers[question.id]
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) next[question.id] = '필수 질문입니다.'
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    if (!validate()) return
    setStatus('submitting')
    setMessage('')
    try {
      await api(`/api/public/forms/${encodeURIComponent(slug)}/responses`, { method: 'POST', body: JSON.stringify({ answers, website: event.currentTarget.website.value, startedAt }) })
      setStatus('success')
    } catch (caught) {
      setMessage(caught.message)
      setStatus('ready')
    }
  }

  if (status === 'loading') return <div className="public-shell"><main className="public-card"><div className="skeleton cover-skeleton" /><div className="skeleton skeleton-title" /><div className="skeleton public-field-skeleton" /></main></div>
  if (status === 'error') return <div className="public-shell"><main className="public-message"><WarningCircle size={42} /><h1>폼을 열 수 없습니다</h1><p>{message}</p></main></div>
  if (status === 'success') return <div className="public-shell" style={pageStyle}><main className="public-message success"><CheckCircle size={48} weight="fill" /><h1>제출되었습니다</h1><p>{form.successMessage}</p></main></div>

  return (
    <div className="public-shell" style={pageStyle}>
      <main className="public-card">
        {form.theme?.coverUrl ? <img className="public-cover" src={form.theme.coverUrl} alt="" /> : null}
        <header className="public-heading"><h1>{form.title}</h1>{form.description ? <p>{form.description}</p> : null}</header>
        <form onSubmit={submit} noValidate>
          <PublicFields questions={form.questions} answers={answers} onChange={setAnswers} errors={errors} />
          <label className="honeypot" aria-hidden="true">웹사이트<input name="website" tabIndex="-1" autoComplete="off" /></label>
          {message ? <div className="submit-error"><WarningCircle /> {message}</div> : null}
          <button className="public-submit" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? <><SpinnerGap className="spin" /> 제출 중</> : '제출하기'}</button>
        </form>
      </main>
      <footer className="public-footer"><SquaresFour weight="fill" /> 폼메이커로 제작됨</footer>
    </div>
  )
}
