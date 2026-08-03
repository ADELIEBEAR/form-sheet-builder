import { ArrowSquareOut, Check, DeviceMobile, Desktop, Eye, FloppyDisk, Gear, LinkSimple, ListBullets, PaintBrush, Plus, SpinnerGap } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from '../lib/router'
import AppFrame from '../components/AppFrame'
import FieldInspector from '../components/FieldInspector'
import FormCanvas from '../components/FormCanvas'
import IntegrationPanel from '../components/IntegrationPanel'
import ThemePanel from '../components/ThemePanel'
import { api } from '../lib/api'
import { emptyProject, FIELD_GROUPS, makeField, makePage, moveItem, TYPE_LABEL } from '../lib/maker'

export default function Studio() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(emptyProject)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [panel, setPanel] = useState('field')
  const [device, setDevice] = useState('desktop')
  const [loading, setLoading] = useState(Boolean(projectId))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) {
      const first = project.pages[0]?.fields[0]?.id
      setSelectedFieldId(first || '')
      return
    }
    api(`/maker/projects/${projectId}`).then((data) => {
      setProject(data.project)
      setSelectedFieldId(data.project.pages?.[0]?.fields?.[0]?.id || '')
    }).catch((caught) => setError(caught.message)).finally(() => setLoading(false))
  }, [projectId])

  const page = project.pages[pageIndex]
  const fieldIndex = page?.fields.findIndex((field) => field.id === selectedFieldId) ?? -1
  const selectedField = fieldIndex >= 0 ? page.fields[fieldIndex] : null
  const canPublish = useMemo(() => project.title.trim() && project.pages.some((item) => item.fields.some((field) => field.type !== 'heading')), [project])

  async function save(status = project.status) {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload = { ...project, status }
      const data = projectId
        ? await api(`/maker/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/maker/projects', { method: 'POST', body: JSON.stringify(payload) })
      setProject(data.project)
      setSaved(true)
      if (!projectId) navigate(`/studio/${data.project.id}`, { replace: true })
      window.setTimeout(() => setSaved(false), 1700)
    } catch (caught) { setError(caught.message) } finally { setSaving(false) }
  }

  function updatePage(next) {
    setProject((current) => ({ ...current, pages: current.pages.map((item, index) => index === pageIndex ? next : item) }))
  }

  function addField(type) {
    const field = makeField(type)
    updatePage({ ...page, fields: [...page.fields, field] })
    setSelectedFieldId(field.id)
    setPanel('field')
  }

  function addPage() {
    const next = makePage(project.pages.length)
    setProject((current) => ({ ...current, pages: [...current.pages, next] }))
    setPageIndex(project.pages.length)
    setSelectedFieldId(next.fields[0]?.id || '')
  }

  function selectPage(index) {
    setPageIndex(index)
    setSelectedFieldId(project.pages[index]?.fields[0]?.id || '')
  }

  function removePage(index) {
    if (project.pages.length === 1) return setError('페이지는 하나 이상 필요합니다.')
    const nextPages = project.pages.filter((_, itemIndex) => itemIndex !== index)
    setProject((current) => ({ ...current, pages: nextPages }))
    const nextIndex = Math.max(0, Math.min(index, nextPages.length - 1))
    setPageIndex(nextIndex)
    setSelectedFieldId(nextPages[nextIndex]?.fields[0]?.id || '')
  }

  function updateField(nextField) {
    updatePage({ ...page, fields: page.fields.map((field, index) => index === fieldIndex ? nextField : field) })
  }

  function deleteField() {
    const next = page.fields.filter((_, index) => index !== fieldIndex)
    updatePage({ ...page, fields: next })
    setSelectedFieldId(next[Math.min(fieldIndex, next.length - 1)]?.id || '')
  }

  function duplicateField() {
    const copy = { ...selectedField, id: crypto.randomUUID(), label: `${selectedField.label} 복사본` }
    const next = [...page.fields.slice(0, fieldIndex + 1), copy, ...page.fields.slice(fieldIndex + 1)]
    updatePage({ ...page, fields: next })
    setSelectedFieldId(copy.id)
  }

  function moveField(direction) {
    const next = moveItem(page.fields, fieldIndex, fieldIndex + direction)
    updatePage({ ...page, fields: next })
  }

  if (loading) return <div className="studio-loading"><SpinnerGap className="spin" /><span>편집기를 불러오는 중입니다</span></div>

  const center = <div className="studio-name"><input value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} aria-label="폼 제목" /><span className={project.status}>{project.status === 'published' ? '게시 중' : '초안'}</span></div>
  const actions = <><span className={`saved-note ${saved ? 'show' : ''}`}><Check weight="bold" /> 저장됨</span>{projectId ? <Link className="header-text-button" to={`/responses/${projectId}`}>응답 {project.responseCount || 0}</Link> : null}{project.status === 'published' ? <a className="square-button" href={`/s/${project.slug}`} target="_blank" rel="noreferrer" aria-label="공개 폼 열기"><Eye /></a> : null}<button className="studio-secondary header-save" type="button" onClick={() => save()} disabled={saving}>{saving ? <SpinnerGap className="spin" /> : <FloppyDisk />} 저장</button><button className="studio-primary header-publish" type="button" onClick={() => save(project.status === 'published' ? 'draft' : 'published')} disabled={saving || !canPublish}>{project.status === 'published' ? '게시 중지' : '게시하기'}</button></>

  return (
    <AppFrame backTo="/workspace" center={center} actions={actions}>
      <main className="studio-layout">
        <aside className="studio-outline">
          <div className="outline-heading"><strong>구성</strong><button type="button" onClick={addPage}><Plus /> 페이지</button></div>
          <div className="page-list">{project.pages.map((item, index) => <div className={pageIndex === index ? 'page-item active' : 'page-item'} key={item.id}><button type="button" onClick={() => selectPage(index)}><span>{index + 1}</span><strong>{item.title || `페이지 ${index + 1}`}</strong><small>{item.fields.length}개 항목</small></button>{project.pages.length > 1 ? <button className="page-remove" type="button" onClick={() => removePage(index)} aria-label="페이지 삭제">×</button> : null}</div>)}</div>
          <div className="field-palette"><strong>질문 추가</strong>{FIELD_GROUPS.map((group) => <div key={group.label}><span>{group.label}</span><div>{group.types.map((type) => <button type="button" key={type} onClick={() => addField(type)}><Plus /> {TYPE_LABEL[type]}</button>)}</div></div>)}</div>
        </aside>

        <section className="studio-stage">
          {error ? <div className="studio-error">{error}<button type="button" onClick={() => setError('')}>닫기</button></div> : null}
          <div className="stage-toolbar"><div><button className={device === 'desktop' ? 'active' : ''} type="button" onClick={() => setDevice('desktop')} aria-label="데스크톱 미리보기"><Desktop /></button><button className={device === 'mobile' ? 'active' : ''} type="button" onClick={() => setDevice('mobile')} aria-label="모바일 미리보기"><DeviceMobile /></button></div><span>응답 화면 미리보기</span></div>
          <div className={`preview-frame ${device}`}><FormCanvas project={project} pageIndex={pageIndex} onPage={setPageIndex} preview selectedFieldId={selectedFieldId} onSelectField={(id) => { setSelectedFieldId(id); setPanel('field') }} /></div>
        </section>

        <aside className="studio-inspector">
          <nav className="inspector-tabs"><button className={panel === 'field' ? 'active' : ''} type="button" onClick={() => setPanel('field')}><ListBullets /> 항목</button><button className={panel === 'design' ? 'active' : ''} type="button" onClick={() => setPanel('design')}><PaintBrush /> 디자인</button><button className={panel === 'share' ? 'active' : ''} type="button" onClick={() => setPanel('share')}><Gear /> 설정</button></nav>
          {panel === 'field' ? <FieldInspector field={selectedField} index={fieldIndex} total={page?.fields.length || 0} onChange={updateField} onDuplicate={duplicateField} onDelete={deleteField} onMove={moveField} /> : null}
          {panel === 'design' ? <ThemePanel project={project} projectId={projectId} onChange={setProject} /> : null}
          {panel === 'share' ? <div className="settings-stack"><div className="inspector-panel"><div className="panel-heading"><span>공개 설정</span><strong>주소와 완료 화면</strong></div><label className="studio-control"><span>공개 주소</span><div className="slug-input"><span>/s/</span><input value={project.slug || ''} onChange={(event) => setProject({ ...project, slug: event.target.value.toLowerCase().replace(/[^a-z0-9가-힣-]/g, '-') })} placeholder="my-form" /></div></label><label className="studio-control"><span>버튼 문구</span><input value={project.settings.submitLabel} onChange={(event) => setProject({ ...project, settings: { ...project.settings, submitLabel: event.target.value } })} /></label><label className="studio-control"><span>제출 완료 제목</span><input value={project.settings.successTitle} onChange={(event) => setProject({ ...project, settings: { ...project.settings, successTitle: event.target.value } })} /></label><label className="studio-control"><span>제출 완료 안내</span><textarea rows="3" value={project.settings.successMessage} onChange={(event) => setProject({ ...project, settings: { ...project.settings, successMessage: event.target.value } })} /></label>{project.status === 'published' ? <button className="copy-link-button" type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${project.slug}`)}><LinkSimple /> 공개 링크 복사</button> : null}</div><IntegrationPanel projectId={projectId} project={project} onConnected={setProject} /></div> : null}
        </aside>
      </main>
    </AppFrame>
  )
}
