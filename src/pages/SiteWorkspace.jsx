import { ArrowSquareOut, Check, Copy, GlobeHemisphereWest, LinkSimple, MagnifyingGlass, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import AppFrame from '../components/AppFrame'
import WorkspaceSidebar from '../components/WorkspaceSidebar'
import { api } from '../lib/api'
import { Link } from '../lib/router'
import { publicSiteUrl } from '../lib/share'

export default function SiteWorkspace() {
  const [sites, setSites] = useState([])
  const [projects, setProjects] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/maker/sites'), api('/maker/projects')])
      .then(([siteData, projectData]) => { setSites(siteData.sites); setProjects(projectData.projects) })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [])

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const visible = useMemo(() => sites.filter((site) => {
    const project = projectMap.get(site.formProjectId)
    return `${site.title} ${site.slug} ${project?.title || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  }), [projectMap, query, sites])

  async function toggle(site) {
    setBusy(site.id)
    setError('')
    try {
      const nextStatus = site.status === 'published' ? 'draft' : 'published'
      const data = await api(`/maker/sites/${site.id}`, { method: 'PUT', body: { ...site, status: nextStatus } })
      setSites((current) => current.map((item) => item.id === site.id ? data.site : item))
    } catch (caught) { setError(caught.message) } finally { setBusy('') }
  }

  async function remove(site) {
    if (!window.confirm(`'${site.title}' 사이트를 삭제할까요? 연결된 폼과 응답은 삭제되지 않습니다.`)) return
    setBusy(site.id)
    try {
      await api(`/maker/sites/${site.id}`, { method: 'DELETE' })
      setSites((current) => current.filter((item) => item.id !== site.id))
    } catch (caught) { setError(caught.message) } finally { setBusy('') }
  }

  async function copyLink(site) {
    try {
      await navigator.clipboard.writeText(publicSiteUrl(site))
      setCopied(site.id)
      window.setTimeout(() => setCopied(''), 1500)
    } catch {
      setError('공개 주소를 복사하지 못했습니다.')
    }
  }

  return (
    <AppFrame sidebar={<WorkspaceSidebar active="sites" />} actions={<Link className="studio-primary" to="/site/new"><Plus weight="bold" /> 새 홍보 사이트</Link>}>
      <main className="workspace-main site-workspace-main">
        <div className="workspace-heading">
          <div><h1>홍보 사이트</h1><p>소개 페이지와 기존 신청 폼을 한 주소로 연결하세요.</p></div>
          <label className="workspace-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="사이트 검색" /></label>
        </div>
        {error ? <div className="inline-alert">{error}</div> : null}
        {loading ? <div className="site-card-grid"><div className="project-skeleton" /><div className="project-skeleton" /></div> : null}
        {!loading && sites.length === 0 ? <section className="workspace-empty site-empty"><div className="site-empty-mark"><GlobeHemisphereWest /></div><h2>첫 홍보 사이트를 만들어 볼까요?</h2><p>대응알림, 상담, 예약처럼 설명과 신청이 함께 필요한 페이지를 만들 수 있어요.</p><Link className="studio-primary" to="/site/new"><Plus weight="bold" /> 사이트 만들기</Link></section> : null}
        {!loading && sites.length > 0 ? <div className="site-card-grid">
          {visible.map((site) => {
            const project = projectMap.get(site.formProjectId)
            const hero = site.content?.sections?.find((section) => section.type === 'hero')?.data
            return <article className="site-workspace-card" key={site.id} style={{ '--card-accent': site.theme?.accent, '--card-bg': site.theme?.background, '--card-text': site.theme?.text }}>
              <Link className="site-card-preview" to={`/site/${site.id}`}>
                <span className="site-card-status">{site.status === 'published' ? '공개 중' : '초안'}</span>
                <strong>{hero?.title || site.title}</strong>
                <small>/p/{site.slug}</small>
                <span className="site-card-form"><LinkSimple /> {project ? project.title : '연결된 폼 없음'}</span>
              </Link>
              <div className="site-card-info"><div><strong>{site.title}</strong><time>{new Date(site.updatedAt).toLocaleDateString('ko-KR')} 수정</time></div></div>
              <nav className="site-card-actions">
                <Link to={`/site/${site.id}`}><PencilSimple weight="bold" /> 편집</Link>
                <button type="button" onClick={() => toggle(site)} disabled={busy === site.id}><GlobeHemisphereWest /> {site.status === 'published' ? '비공개' : '공개'}</button>
                <button type="button" onClick={() => copyLink(site)} disabled={site.status !== 'published'}>{copied === site.id ? <Check /> : <Copy />} {copied === site.id ? '복사됨' : '링크'}</button>
                <a href={site.status === 'published' ? publicSiteUrl(site) : undefined} target="_blank" rel="noreferrer" aria-disabled={site.status !== 'published'}><ArrowSquareOut /> 미리보기</a>
                <button className="danger" type="button" onClick={() => remove(site)} disabled={busy === site.id} aria-label={`${site.title} 삭제`}><Trash /></button>
              </nav>
            </article>
          })}
          {visible.length === 0 ? <div className="no-search-result">검색 결과가 없습니다.</div> : null}
        </div> : null}
      </main>
    </AppFrame>
  )
}
