import { SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useParams } from '../lib/router'
import FormCanvas from '../components/FormCanvas'
import { api } from '../lib/api'

export default function PublicForm() {
  const { slug } = useParams()
  const [project, setProject] = useState(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [startedAt] = useState(Date.now())

  useEffect(() => {
    api(`/maker/public/${encodeURIComponent(slug)}`).then((data) => { setProject(data.project); setStatus('ready') }).catch((caught) => { setMessage(caught.message); setStatus('error') })
  }, [slug])

  function validate() {
    const next = {}
    project.pages.flatMap((page) => page.fields || []).forEach((field) => {
      if (field.type === 'heading' || !field.required) return
      const value = answers[field.id]
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) next[field.id] = '필수 질문입니다.'
    })
    setErrors(next)
    if (Object.keys(next).length) {
      if ((project.theme?.layout || 'focus') === 'focus') {
        const fields = project.pages.flatMap((page) => page.fields || [])
        const invalidField = fields.findIndex((field) => next[field.id])
        if (invalidField >= 0) setPageIndex(invalidField + 1)
      } else {
        const invalidPage = project.pages.findIndex((page) => page.fields.some((field) => next[field.id]))
        if (invalidPage >= 0) setPageIndex(invalidPage)
      }
    }
    return Object.keys(next).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    if (!validate()) return
    setStatus('submitting')
    setMessage('')
    try {
      await api(`/maker/public/${encodeURIComponent(slug)}/submissions`, { method: 'POST', body: JSON.stringify({ answers, website: event.currentTarget.website.value, startedAt }) })
      setStatus('success')
    } catch (caught) {
      setMessage(caught.message)
      setStatus('ready')
    }
  }

  if (status === 'loading') return <div className="public-loading"><SpinnerGap className="spin" /><span>폼을 불러오는 중입니다</span></div>
  if (status === 'error') return <main className="public-error"><WarningCircle /><h1>폼을 열 수 없습니다</h1><p>{message}</p></main>

  return (
    <main className="public-page" style={{ background: project.theme?.background || '#f0edfb' }}>
      <form className="public-form-wrap" onSubmit={submit} noValidate>
        <FormCanvas project={project} pageIndex={pageIndex} answers={answers} onAnswers={setAnswers} onPage={setPageIndex} errors={errors} submitted={status === 'success'} submitting={status === 'submitting'} />
        <label className="honeypot" aria-hidden="true">웹사이트<input name="website" tabIndex="-1" autoComplete="off" /></label>
        {message ? <div className="public-submit-error"><WarningCircle /> {message}</div> : null}
      </form>
      <footer className="public-brand"><span className="maker-glyph small"><i /><i /><i /></span> 폼메이커로 제작</footer>
    </main>
  )
}
