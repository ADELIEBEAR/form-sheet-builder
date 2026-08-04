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

  useEffect(() => {
    if (!project) return undefined
    const previousTitle = document.title
    const descriptionMeta = document.querySelector('meta[name="description"]')
    const previousDescription = descriptionMeta?.getAttribute('content') || ''
    document.title = project.settings?.shareTitle || project.title || '폼메이커'
    if (descriptionMeta) descriptionMeta.setAttribute('content', project.settings?.shareDescription ?? project.description ?? '')
    return () => {
      document.title = previousTitle
      if (descriptionMeta) descriptionMeta.setAttribute('content', previousDescription)
    }
  }, [project])

  function answerError(field, value) {
    if (field.type === 'heading') return ''
    const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0)
    if (field.required && empty) return '이 질문에 답해 주세요.'
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) return '이메일 주소를 확인해 주세요.'
    return ''
  }

  function changeAnswers(next) {
    setAnswers(next)
    setErrors((current) => {
      const nextErrors = { ...current }
      for (const field of project.pages.flatMap((page) => page.fields || [])) {
        if (!answerError(field, next[field.id])) delete nextErrors[field.id]
      }
      return nextErrors
    })
  }

  function movePage(nextIndex) {
    const layout = project.theme?.layout || 'focus'
    if (layout === 'focus' && nextIndex > pageIndex && pageIndex > 0) {
      const fields = project.pages.flatMap((page) => page.fields || [])
      const currentField = fields[pageIndex - 1]
      const currentError = currentField ? answerError(currentField, answers[currentField.id]) : ''
      if (currentError) {
        setErrors((current) => ({ ...current, [currentField.id]: currentError }))
        return
      }
    }
    if (layout === 'card' && nextIndex > pageIndex) {
      const pageErrors = Object.fromEntries((project.pages[pageIndex]?.fields || []).map((field) => [field.id, answerError(field, answers[field.id])]).filter(([, error]) => error))
      if (Object.keys(pageErrors).length) {
        setErrors((current) => ({ ...current, ...pageErrors }))
        return
      }
    }
    setPageIndex(nextIndex)
  }

  function validate() {
    const next = {}
    project.pages.flatMap((page) => page.fields || []).forEach((field) => {
      const error = answerError(field, answers[field.id])
      if (error) next[field.id] = error
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
        <FormCanvas project={project} pageIndex={pageIndex} answers={answers} onAnswers={changeAnswers} onPage={movePage} errors={errors} submitted={status === 'success'} submitting={status === 'submitting'} />
        <label className="honeypot" aria-hidden="true">웹사이트<input name="website" tabIndex="-1" autoComplete="off" /></label>
        {message ? <div className="public-submit-error"><WarningCircle /> {message}</div> : null}
      </form>
      <footer className="public-brand"><span className="maker-glyph small"><i /><i /><i /></span><span>폼메이커<small>정석제작</small></span></footer>
    </main>
  )
}
