import { Check, Copy, DotsThree, Eye, FilePlus, FloppyDisk, Folder, LinkSimple, LockKey, MagnifyingGlass, NotePencil, Plus, Trash, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '../lib/router'
import AppFrame from '../components/AppFrame'
import WorkspaceSidebar from '../components/WorkspaceSidebar'
import { api } from '../lib/api'
import { MEMO_COLOR_PRESETS } from '../lib/maker'

export default function Workspace() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState('')
  const [copied, setCopied] = useState('')
  const [folder, setFolder] = useState('전체')
  const [editingMeta, setEditingMeta] = useState('')
  const [metaDraft, setMetaDraft] = useState({ folder: '', memo: '', memoColor: 'lemon' })
  const [metaSaving, setMetaSaving] = useState(false)

  useEffect(() => {
    api('/maker/projects').then((data) => setProjects(data.projects)).catch((caught) => setError(caught.message)).finally(() => setLoading(false))
  }, [])

  const folders = useMemo(() => [...new Set(projects.map((project) => project.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')), [projects])
  const visible = useMemo(() => projects.filter((project) => {
    const matchesFolder = folder === '전체' || (folder === '미분류' ? !project.folder : project.folder === folder)
    const searchText = `${project.title} ${project.folder || ''} ${project.memo || ''}`.toLowerCase()
    return matchesFolder && searchText.includes(query.toLowerCase())
  }), [folder, projects, query])

  async function duplicate(id) {
    try {
      const data = await api(`/maker/projects/${id}/duplicate`, { method: 'POST' })
      setProjects((current) => [data.project, ...current])
      setMenu('')
    } catch (caught) { setError(caught.message) }
  }

  async function remove(id) {
    if (!window.confirm('이 폼과 응답을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.')) return
    try {
      await api(`/maker/projects/${id}`, { method: 'DELETE' })
      setProjects((current) => current.filter((project) => project.id !== id))
      setMenu('')
    } catch (caught) { setError(caught.message) }
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

  function openMetaEditor(project) {
    if (editingMeta === project.id) {
      setEditingMeta('')
      return
    }
    setMetaDraft({ folder: project.folder || '', memo: project.memo || '', memoColor: project.memoColor || 'lemon' })
    setEditingMeta(project.id)
    setMenu('')
    setError('')
  }

  async function saveMeta(event, project) {
    event.preventDefault()
    if (metaSaving) return
    setMetaSaving(true)
    setError('')
    try {
      const data = await api(`/maker/projects/${project.id}/meta`, { method: 'PATCH', body: metaDraft })
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, ...data.meta } : item))
      setEditingMeta('')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setMetaSaving(false)
    }
  }

  function metaEditorKeyDown(event, project) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveMeta(event, project)
    if (event.key === 'Escape' && !metaSaving) setEditingMeta('')
  }

  return (
    <AppFrame sidebar={<WorkspaceSidebar active="forms" />} actions={<Link className="studio-primary header-new" to="/studio/new"><Plus weight="bold" /> 새 폼</Link>}>
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
          {visible.map((project) => <article className={editingMeta === project.id ? 'project-row editing-meta' : 'project-row'} key={project.id}>
            <button className="project-open" type="button" onClick={() => navigate(`/studio/${project.id}`)}>
              <span className={project.theme?.coverUrl ? 'project-thumb has-cover' : 'project-thumb'} style={project.theme?.coverUrl ? { backgroundImage: `url("${project.theme.coverUrl}")` } : { '--thumb-bg': project.theme?.background, '--thumb-accent': project.theme?.accent }}><i /><i /><b /></span>
              <span className="project-copy">
                <span className="project-card-meta">{project.folder ? <b><Folder weight="fill" />{project.folder}</b> : <b className="muted"><Folder />미분류</b>}{project.responseLockEnabled ? <b className="secure"><LockKey weight="fill" />응답 잠금</b> : null}</span>
                <strong>{project.title}</strong>
                <small>{project.status === 'published' ? '게시 중' : '초안'} · /s/{project.slug}</small>
                {project.memo ? <em className={`project-memo-preview memo-tone-${project.memoColor || 'lemon'}`}><NotePencil /><span>{project.memo}</span></em> : null}
              </span>
            </button>
            <time>{new Date(project.updatedAt).toLocaleDateString('ko-KR')}</time>
            <Link className="response-count" to={`/responses/${project.id}`}>{project.responseCount.toLocaleString()}개</Link>
            <div className="project-row-actions">
              <button className={editingMeta === project.id ? 'project-meta-toggle active' : 'project-meta-toggle'} type="button" onClick={() => openMetaEditor(project)} aria-expanded={editingMeta === project.id}><NotePencil /> 정리</button>
              <div className="row-menu-wrap"><button className="row-menu-button" type="button" onClick={() => setMenu(menu === project.id ? '' : project.id)} aria-label="폼 메뉴"><DotsThree /></button>{menu === project.id ? <div className="row-menu">{project.status === 'published' ? <><a href={`/s/${project.slug}`} target="_blank" rel="noreferrer"><Eye /> 공개 폼 보기</a><button type="button" onClick={() => copyLink(project)}>{copied === project.id ? <Check /> : <LinkSimple />} {copied === project.id ? '복사됨' : '링크 복사'}</button></> : null}<button type="button" onClick={() => duplicate(project.id)}><Copy /> 복제</button><button className="danger" type="button" onClick={() => remove(project.id)}><Trash /> 삭제</button></div> : null}</div>
            </div>

            {editingMeta === project.id ? <form className={`project-meta-editor memo-tone-${metaDraft.memoColor}`} onSubmit={(event) => saveMeta(event, project)} onKeyDown={(event) => metaEditorKeyDown(event, project)}>
              <header><span className="project-meta-icon"><NotePencil weight="fill" /></span><span><strong>폴더와 메모</strong><small>공개 폼에는 보이지 않는 나만의 정리 공간</small></span><button type="button" onClick={() => setEditingMeta('')} aria-label="편집 닫기" disabled={metaSaving}><X /></button></header>
              <div className="project-meta-fields">
                <label className="project-folder-field"><span>폴더</span><input list={`folder-list-${project.id}`} maxLength="80" value={metaDraft.folder} onChange={(event) => setMetaDraft({ ...metaDraft, folder: event.target.value })} placeholder="예: 2026 고객 신청" /><datalist id={`folder-list-${project.id}`}>{folders.map((item) => <option value={item} key={item} />)}</datalist></label>
                <label className="project-memo-field"><span>내 메모 <small>{metaDraft.memo.length.toLocaleString()} / 2,000</small></span><textarea rows="6" maxLength="2000" value={metaDraft.memo} onChange={(event) => setMetaDraft({ ...metaDraft, memo: event.target.value })} placeholder="마감일, 담당자, 수정할 내용 등을 넉넉하게 적어두세요." /></label>
                <fieldset className="memo-color-picker"><legend>메모 색상</legend><div>{MEMO_COLOR_PRESETS.map(([value, label]) => <button className={`memo-color-${value}${metaDraft.memoColor === value ? ' active' : ''}`} type="button" key={value} onClick={() => setMetaDraft({ ...metaDraft, memoColor: value })} aria-label={`${label} 메모 색상`} title={label}>{metaDraft.memoColor === value ? <Check weight="bold" /> : null}</button>)}</div></fieldset>
              </div>
              <footer><span>Ctrl + Enter로 바로 저장</span><div><button type="button" onClick={() => setEditingMeta('')} disabled={metaSaving}>취소</button><button className="project-meta-save" type="submit" disabled={metaSaving}><FloppyDisk />{metaSaving ? '저장 중' : '저장'}</button></div></footer>
            </form> : null}
          </article>)}
          {visible.length === 0 ? <div className="no-search-result">검색 결과가 없습니다.</div> : null}
        </div> : null}
      </main>
    </AppFrame>
  )
}
