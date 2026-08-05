import { Check, Code, Copy, Eye, FilePlus, Folder, LinkSimple, LockKey, MagnifyingGlass, NotePencil, PencilSimple, Plus, Trash, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '../lib/router'
import AppFrame from '../components/AppFrame'
import ExternalConnectPanel from '../components/ExternalConnectPanel'
import WorkspaceSidebar from '../components/WorkspaceSidebar'
import { api } from '../lib/api'

export default function Workspace() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState('')
  const [folder, setFolder] = useState('전체')
  const [busyAction, setBusyAction] = useState('')
  const [connectProject, setConnectProject] = useState(null)
  const [metaStatus, setMetaStatus] = useState({})
  const projectsRef = useRef([])
  const saveVersionRef = useRef({})
  const saveQueueRef = useRef({})
  const statusTimerRef = useRef({})

  useEffect(() => {
    api('/maker/projects').then((data) => setProjects(data.projects)).catch((caught) => setError(caught.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    projectsRef.current = projects
  }, [projects])

  useEffect(() => () => Object.values(statusTimerRef.current).forEach(window.clearTimeout), [])

  const folders = useMemo(() => [...new Set(projects.map((project) => project.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')), [projects])
  const visible = useMemo(() => projects.filter((project) => {
    const matchesFolder = folder === '전체' || (folder === '미분류' ? !project.folder : project.folder === folder)
    const searchText = `${project.title} ${project.folder || ''} ${project.memo || ''}`.toLowerCase()
    return matchesFolder && searchText.includes(query.toLowerCase())
  }), [folder, projects, query])

  async function duplicate(id) {
    setBusyAction(`duplicate-${id}`)
    try {
      const data = await api(`/maker/projects/${id}/duplicate`, { method: 'POST' })
      const next = [data.project, ...projectsRef.current]
      projectsRef.current = next
      setProjects(next)
    } catch (caught) { setError(caught.message) } finally { setBusyAction('') }
  }

  async function remove(id) {
    if (!window.confirm('이 폼과 응답을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.')) return
    setBusyAction(`remove-${id}`)
    try {
      await api(`/maker/projects/${id}`, { method: 'DELETE' })
      const next = projectsRef.current.filter((project) => project.id !== id)
      projectsRef.current = next
      setProjects(next)
    } catch (caught) { setError(caught.message) } finally { setBusyAction('') }
  }

  async function toggleStatus(project) {
    setBusyAction(`status-${project.id}`)
    setError('')
    try {
      const data = await api(`/maker/projects/${project.id}`, { method: 'PUT', body: { ...project, status: project.status === 'published' ? 'draft' : 'published' } })
      const next = projectsRef.current.map((item) => item.id === project.id ? data.project : item)
      projectsRef.current = next
      setProjects(next)
    } catch (caught) { setError(caught.message) } finally { setBusyAction('') }
  }

  async function copyLink(project) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${project.slug}`)
      setCopied(project.id)
      window.setTimeout(() => setCopied(''), 1500)
    } catch {
      setError('링크를 복사하지 못했습니다. 공개 폼을 열고 주소를 복사해 주세요.')
    }
  }

  function updateLocalMeta(projectId, patch) {
    const next = projectsRef.current.map((project) => project.id === projectId ? { ...project, ...patch } : project)
    projectsRef.current = next
    setProjects(next)
  }

  async function persistMeta(projectId, patch = {}) {
    const current = projectsRef.current.find((project) => project.id === projectId)
    if (!current) return
    const payload = {
      folder: current.folder || '',
      memo: current.memo || '',
      memoColor: current.memoColor || 'lemon',
      ...patch,
    }
    updateLocalMeta(projectId, patch)
    const version = (saveVersionRef.current[projectId] || 0) + 1
    saveVersionRef.current[projectId] = version
    window.clearTimeout(statusTimerRef.current[projectId])
    setMetaStatus((status) => ({ ...status, [projectId]: 'saving' }))
    setError('')
    try {
      const save = (saveQueueRef.current[projectId] || Promise.resolve())
        .catch(() => {})
        .then(() => api(`/maker/projects/${projectId}/meta`, { method: 'PATCH', body: payload }))
      saveQueueRef.current[projectId] = save
      await save
      if (saveVersionRef.current[projectId] !== version) return
      setMetaStatus((status) => ({ ...status, [projectId]: 'saved' }))
      statusTimerRef.current[projectId] = window.setTimeout(() => {
        setMetaStatus((status) => ({ ...status, [projectId]: '' }))
      }, 1800)
    } catch (caught) {
      if (saveVersionRef.current[projectId] !== version) return
      setMetaStatus((status) => ({ ...status, [projectId]: 'error' }))
      setError(caught.message)
    }
  }

  function metaStatusLabel(projectId) {
    if (metaStatus[projectId] === 'saving') return '저장 중…'
    if (metaStatus[projectId] === 'saved') return '저장됨'
    if (metaStatus[projectId] === 'error') return '저장 실패'
    return ''
  }

  return (
    <AppFrame sidebar={<WorkspaceSidebar active="forms" />} actions={<><Link className="studio-secondary header-responses" to="/responses"><LockKey weight="fill" /> 응답 관리자</Link><Link className="studio-primary header-new" to="/studio/new"><Plus weight="bold" /> 새 폼</Link></>}>
      <main className="workspace-main">
        <div className="workspace-heading"><div><h1>내 폼</h1><p>만들고 있는 폼과 들어온 응답을 한곳에서 확인하세요.</p></div><label className="workspace-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="폼 검색" /></label></div>
        {projects.length ? <nav className="folder-filter" aria-label="폼 폴더">
          {['전체', ...folders, '미분류'].map((item) => <button className={folder === item ? 'active' : ''} type="button" key={item} onClick={() => setFolder(item)}><Folder weight={folder === item ? 'fill' : 'regular'} />{item}<span>{item === '전체' ? projects.length : projects.filter((project) => item === '미분류' ? !project.folder : project.folder === item).length}</span></button>)}
        </nav> : null}
        {error ? <div className="inline-alert">{error}</div> : null}
        {loading ? <div className="project-list"><div className="project-skeleton" /><div className="project-skeleton" /></div> : null}
        {!loading && projects.length === 0 ? <section className="workspace-empty"><div className="empty-art"><span /><span /><FilePlus /></div><h2>첫 폼을 만들어 볼까요?</h2><p>질문을 구성하고 공개 링크를 만드는 데 몇 분이면 충분합니다.</p><Link className="studio-primary" to="/studio/new"><Plus weight="bold" /> 빈 폼에서 시작</Link></section> : null}
        {!loading && projects.length > 0 ? <div className="project-list">
          <div className="project-list-head"><span>{visible.length}개의 폼</span><span>최근 수정</span><span>응답</span><span /></div>
          {visible.map((project) => <article className="project-row" key={project.id}>
            <button className="project-open" type="button" onClick={() => navigate(`/studio/${project.id}`)}>
              <span className={project.theme?.coverUrl ? 'project-thumb has-cover' : 'project-thumb'} style={project.theme?.coverUrl ? { backgroundImage: `url("${project.theme.coverUrl}")` } : { '--thumb-bg': project.theme?.background, '--thumb-accent': project.theme?.accent }}><i /><i /><b /></span>
              <span className="project-copy">
                <span className="project-card-meta"><b>{project.status === 'published' ? '게시 중' : '초안'}</b></span>
                <strong>{project.title}</strong>
                <small>/s/{project.slug}</small>
                <time>{new Date(project.updatedAt).toLocaleDateString('ko-KR')} 수정</time>
              </span>
            </button>
            <section className="project-inline-meta" aria-label={`${project.title} 분류와 한 줄 설명`}>
              <label className="inline-folder-field" title="분류"><Folder weight="fill" /><input list={`folder-list-${project.id}`} maxLength="80" value={project.folder || ''} onChange={(event) => updateLocalMeta(project.id, { folder: event.target.value })} onBlur={(event) => persistMeta(project.id, { folder: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} placeholder="분류 없음" aria-label={`${project.title} 분류`} /><datalist id={`folder-list-${project.id}`}>{folders.map((item) => <option value={item} key={item} />)}</datalist></label>
              <label className="inline-memo-field" title="한 줄 설명"><NotePencil weight="fill" /><input maxLength="160" value={project.memo || ''} onChange={(event) => updateLocalMeta(project.id, { memo: event.target.value })} onBlur={(event) => persistMeta(project.id, { memo: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} placeholder="어떤 폼인지 한 줄로 적어두세요" aria-label={`${project.title} 한 줄 설명`} /></label>
              <small className={`project-meta-status ${metaStatus[project.id] || ''}`} aria-live="polite">{metaStatusLabel(project.id)}</small>
            </section>
            <nav className="project-quick-actions" aria-label={`${project.title} 빠른 작업`}>
              <div className="project-main-actions">
                <button type="button" onClick={() => navigate(`/studio/${project.id}`)}><PencilSimple weight="bold" /> 편집</button>
                <Link to={`/responses/${project.id}`}><LockKey weight="fill" /> 응답 보기 <b>{project.responseCount.toLocaleString()}</b></Link>
                <Link to="/responses"><Eye weight="fill" /> 전체 응답</Link>
                <button className={project.status === 'published' ? 'published' : ''} type="button" disabled={busyAction === `status-${project.id}`} onClick={() => toggleStatus(project)} title={project.status === 'published' ? '눌러서 비공개로 전환' : '눌러서 공개'}><LockKey weight={project.status === 'published' ? 'regular' : 'fill'} /> {busyAction === `status-${project.id}` ? '변경 중' : project.status === 'published' ? '공개 중' : '비공개'}</button>
              </div>
              <div className="project-utility-actions">
                <button type="button" disabled={project.status !== 'published'} onClick={() => copyLink(project)} title={project.status === 'published' ? '공개 링크 복사' : '폼을 공개하면 링크를 복사할 수 있습니다'}>{copied === project.id ? <Check weight="bold" /> : <LinkSimple />} {copied === project.id ? '복사됨' : '링크 복사'}</button>
                <button type="button" disabled={project.status !== 'published'} onClick={() => setConnectProject(project)} title={project.status === 'published' ? '외부 사이트에서 이 폼으로 응답 받기' : '폼을 공개하면 외부 사이트를 연결할 수 있습니다'}><Code /> 외부 연결</button>
                <button type="button" disabled={busyAction === `duplicate-${project.id}`} onClick={() => duplicate(project.id)} aria-label={`${project.title} 복제`} title={busyAction === `duplicate-${project.id}` ? '복제 중' : '복제'}><Copy /></button>
                <button className="danger" type="button" disabled={busyAction === `remove-${project.id}`} onClick={() => remove(project.id)} aria-label={`${project.title} 삭제`} title="삭제"><Trash /></button>
              </div>
            </nav>
          </article>)}
          {visible.length === 0 ? <div className="no-search-result">검색 결과가 없습니다.</div> : null}
        </div> : null}
        {connectProject ? (
          <div className="external-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectProject(null) }}>
            <section className="external-modal" role="dialog" aria-modal="true" aria-labelledby="external-modal-title">
              <header><div><span>EXTERNAL CONNECTION</span><h2 id="external-modal-title">{connectProject.title}</h2></div><button type="button" onClick={() => setConnectProject(null)} aria-label="외부 연결 창 닫기"><X /></button></header>
              <ExternalConnectPanel project={connectProject} />
            </section>
          </div>
        ) : null}
      </main>
    </AppFrame>
  )
}
