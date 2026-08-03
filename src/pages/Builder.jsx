import { Check, Eye, FloppyDisk, Gear, LinkSimple, Plus, SpinnerGap } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from '../lib/router'
import AppShell from '../components/AppShell'
import FieldEditor from '../components/FieldEditor'
import ImageUpload from '../components/ImageUpload'
import SheetPanel from '../components/SheetPanel'
import { api } from '../lib/api'
import { createQuestion, emptyForm, moveItem, QUESTION_TYPES } from '../lib/form'

export default function Builder() {
  const { formId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [tab, setTab] = useState('questions')
  const [loading, setLoading] = useState(Boolean(formId))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!formId) return
    api(`/api/forms/${formId}`).then((data) => setForm(data.form)).catch((caught) => setError(caught.message)).finally(() => setLoading(false))
  }, [formId])

  const canPublish = useMemo(() => form.title.trim() && form.questions.some((question) => question.type !== 'notice'), [form])

  async function save(publish = form.isPublished) {
    if (!form.title.trim()) return setError('폼 제목을 입력해주세요.')
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload = { ...form, isPublished: publish }
      const data = formId
        ? await api(`/api/forms/${formId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/api/forms', { method: 'POST', body: JSON.stringify(payload) })
      setForm(data.form)
      setSaved(true)
      if (!formId) navigate(`/builder/${data.form.id}`, { replace: true })
      window.setTimeout(() => setSaved(false), 1800)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setSaving(false)
    }
  }

  function updateQuestion(index, nextQuestion) {
    setForm((current) => ({ ...current, questions: current.questions.map((question, i) => i === index ? nextQuestion : question) }))
  }

  function addQuestion(type) {
    setForm((current) => ({ ...current, questions: [...current.questions, createQuestion(type)] }))
  }

  if (loading) return <AppShell backTo="/dashboard"><main className="builder-loading container"><div className="skeleton skeleton-title" /><div className="skeleton builder-skeleton" /></main></AppShell>

  const headerActions = <><span className={`save-state ${saved ? 'visible' : ''}`}><Check /> 저장됨</span>{form.slug && form.isPublished ? <a className="button secondary compact" href={`/f/${form.slug}`} target="_blank" rel="noreferrer"><Eye /> 미리보기</a> : null}<button className="button primary compact" type="button" onClick={() => save(form.isPublished)} disabled={saving}>{saving ? <SpinnerGap className="spin" /> : <FloppyDisk />} 저장</button></>

  return (
    <AppShell backTo="/dashboard" actions={headerActions}>
      <main className="builder-layout">
        <aside className="builder-sidebar">
          <div className="builder-form-title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} aria-label="폼 제목" /><span>{form.isPublished ? '게시 중' : '초안'}</span></div>
          <nav className="builder-tabs"><button className={tab === 'questions' ? 'active' : ''} type="button" onClick={() => setTab('questions')}><Plus /> 질문 편집</button><button className={tab === 'settings' ? 'active' : ''} type="button" onClick={() => setTab('settings')}><Gear /> 설정 및 연동</button></nav>
          {tab === 'questions' ? <div className="question-palette"><span>질문 추가</span>{QUESTION_TYPES.map(([type, label]) => <button key={type} type="button" onClick={() => addQuestion(type)}><Plus /> {label}</button>)}</div> : null}
          <div className="sidebar-publish"><button className={`button ${form.isPublished ? 'secondary' : 'primary'}`} type="button" disabled={!canPublish || saving} onClick={() => save(!form.isPublished)}>{form.isPublished ? '게시 중지' : '폼 게시하기'}</button>{form.slug ? <button className="text-button" type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`)}><LinkSimple /> 공개 링크 복사</button> : null}</div>
        </aside>

        <div className="builder-content">
          {error ? <div className="error-panel">{error}</div> : null}
          {tab === 'questions' ? (
            <div className="editor-column">
              <section className="form-intro-editor"><label className="control"><span>폼 설명</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="응답자가 알아야 할 내용을 적어주세요." /></label></section>
              {form.questions.map((question, index) => <FieldEditor key={question.id} question={question} index={index} total={form.questions.length} onChange={(next) => updateQuestion(index, next)} onDuplicate={() => setForm((current) => ({ ...current, questions: [...current.questions.slice(0, index + 1), { ...question, id: crypto.randomUUID() }, ...current.questions.slice(index + 1)] }))} onDelete={() => setForm((current) => ({ ...current, questions: current.questions.filter((_, i) => i !== index) }))} onMove={(direction) => setForm((current) => ({ ...current, questions: moveItem(current.questions, index, index + direction) }))} />)}
              <button className="add-field-button" type="button" onClick={() => addQuestion('short')}><Plus /> 질문 추가</button>
            </div>
          ) : (
            <div className="settings-column">
              <section className="settings-section"><h3>공개 주소</h3><div className="slug-field"><span>{window.location.origin}/f/</span><input value={form.slug || ''} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9가-힣-]/g, '-') })} placeholder="my-form" /></div></section>
              <section className="settings-section"><h3>디자인</h3><ImageUpload value={form.theme?.coverUrl || ''} formId={formId} onChange={(coverUrl) => setForm({ ...form, theme: { ...form.theme, coverUrl } })} /><div className="color-row"><label className="control"><span>포인트 색상</span><input className="color-control" type="color" value={form.theme?.accent || '#0f766e'} onChange={(event) => setForm({ ...form, theme: { ...form.theme, accent: event.target.value } })} /></label><label className="control"><span>배경 색상</span><input className="color-control" type="color" value={form.theme?.surface || '#f3f7f6'} onChange={(event) => setForm({ ...form, theme: { ...form.theme, surface: event.target.value } })} /></label></div></section>
              <section className="settings-section"><label className="control"><span>제출 완료 문구</span><textarea value={form.successMessage} onChange={(event) => setForm({ ...form, successMessage: event.target.value })} /></label></section>
              {formId ? <SheetPanel formId={formId} form={form} onConnected={setForm} /> : <section className="settings-section locked-section"><GoogleLogo size={25} /><div><h3>Google Sheets</h3><p>폼을 먼저 저장하면 시트를 연결할 수 있습니다.</p></div></section>}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
