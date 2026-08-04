import { ArrowRight, CheckCircle, Clock, FileCsv, FileXls, LockKey, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import AppFrame from '../components/AppFrame'
import ResponseAdminGate from '../components/ResponseAdminGate'
import WorkspaceSidebar from '../components/WorkspaceSidebar'
import { api, downloadCsv } from '../lib/api'
import { Link } from '../lib/router'
import { downloadXlsx } from '../lib/xlsx'

const statusLabel = { synced: '시트 저장됨', pending: '전송 대기', failed: '재전송 필요', not_connected: '시트 미연결' }

function answerPreview(answers) {
  const values = Object.values(answers || {}).flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean)
  return values.slice(0, 3).join(' · ') || '응답 내용 없음'
}

export default function AllResponses() {
  const [projects, setProjects] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminReady, setAdminReady] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api('/maker/projects')
      .then((projectData) => {
        setProjects(projectData.projects)
      })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project])), [projects])
  const accessibleSubmissions = submissions
  const filtered = useMemo(() => accessibleSubmissions.filter((submission) => {
    const project = projectMap[submission.projectId]
    const matchesProject = projectFilter === 'all' || submission.projectId === projectFilter
    const text = `${project?.title || ''} ${answerPreview(submission.answers)}`.toLowerCase()
    return matchesProject && text.includes(query.trim().toLowerCase())
  }), [accessibleSubmissions, projectFilter, projectMap, query])
  const failed = accessibleSubmissions.filter((submission) => submission.sheetSyncStatus === 'failed').length
  const pending = accessibleSubmissions.filter((submission) => submission.sheetSyncStatus === 'pending').length
  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [projectFilter, query])

  async function openAdminResponses() {
    setAdminReady(true)
    setLoading(true)
    setError('')
    try {
      const data = await api('/maker/submissions')
      setSubmissions(data.submissions)
    } catch (caught) {
      setError(caught.message)
      setAdminReady(false)
    } finally {
      setLoading(false)
    }
  }

  async function lockAdminResponses() {
    await api('/maker/admin/lock', { method: 'POST' }).catch(() => {})
    setAdminReady(false)
    setSubmissions([])
  }

  const exportRows = [['제출 시각', '폼', '응답 미리보기', '시트 상태'], ...filtered.map((submission) => [new Date(submission.submittedAt).toLocaleString('ko-KR'), projectMap[submission.projectId]?.title || '삭제된 폼', answerPreview(submission.answers), statusLabel[submission.sheetSyncStatus] || submission.sheetSyncStatus])]

  const actions = adminReady ? <div className="response-export-actions"><button className="studio-secondary response-admin-lock" type="button" onClick={lockAdminResponses}><LockKey /> 관리자 잠그기</button>{filtered.length ? <><button className="studio-secondary" type="button" onClick={() => downloadCsv('전체-응답.csv', exportRows)}><FileCsv /> CSV</button><button className="studio-primary" type="button" onClick={() => downloadXlsx('전체-응답.xlsx', exportRows)}><FileXls /> Excel</button></> : null}</div> : null

  return (
    <AppFrame sidebar={<WorkspaceSidebar active="responses" />} actions={actions}>
      <main className="workspace-main all-responses-main">
        <div className="workspace-heading"><div><span className="page-eyebrow">관리자 전용 · 로그인 보호</span><h1>전체 응답</h1><p>모든 폼에 들어온 답변과 Google Sheets 전송 상태를 함께 확인하세요.</p></div></div>
        {error ? <div className="inline-alert">{error}</div> : null}
        {loading ? <div className="response-overview-loading"><i /><i /><i /></div> : null}
        {!loading && !adminReady ? <ResponseAdminGate onUnlocked={openAdminResponses} /> : null}
        {!loading && adminReady ? <>
          <section className="response-overview" aria-label="응답 요약">
            <article><span>확인 가능한 응답</span><strong>{accessibleSubmissions.length.toLocaleString()}</strong><small>{projects.length.toLocaleString()}개 폼에서 수집</small></article>
            <article><span>전송 대기</span><strong>{pending.toLocaleString()}</strong><small><Clock /> Google Sheets로 이동 중</small></article>
            <article className={failed ? 'has-warning' : ''}><span>확인 필요</span><strong>{failed.toLocaleString()}</strong><small>{failed ? <WarningCircle /> : <CheckCircle />} {failed ? '재전송이 필요한 응답' : '모두 정상 처리됨'}</small></article>
          </section>
          <section className="all-response-panel">
            <header className="all-response-tools">
              <label className="workspace-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="폼 이름이나 답변 검색" /></label>
              <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="폼 선택"><option value="all">모든 폼</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select>
              <span>{filtered.length.toLocaleString()}개</span>
            </header>
            {filtered.length === 0 ? <div className="response-empty compact"><h2>표시할 응답이 없습니다</h2><p>새 응답이 들어오면 이곳에서 모든 폼을 함께 볼 수 있습니다.</p></div> : null}
            {visible.length ? <div className="response-table-wrap all-response-table"><table><thead><tr><th>제출 시각</th><th>폼</th><th>응답 미리보기</th><th>시트 상태</th><th /></tr></thead><tbody>{visible.map((submission) => { const project = projectMap[submission.projectId]; return <tr key={submission.id}><td className="date-cell">{new Date(submission.submittedAt).toLocaleString('ko-KR')}</td><td><strong>{project?.title || '삭제된 폼'}</strong></td><td className="answer-preview">{answerPreview(submission.answers)}</td><td><span className={`sheet-status ${submission.sheetSyncStatus}`}>{statusLabel[submission.sheetSyncStatus] || submission.sheetSyncStatus}</span></td><td>{project ? <Link className="response-detail-link" to={`/responses/${project.id}`} aria-label={`${project.title} 응답 상세 보기`}><ArrowRight /></Link> : null}</td></tr> })}</tbody></table></div> : null}
            {visible.length ? <div className="mobile-all-response-list" aria-label="모바일 응답 목록">{visible.map((submission) => {
              const project = projectMap[submission.projectId]
              const content = <><span className="mobile-response-topline"><strong>{project?.title || '삭제된 폼'}</strong><span className={`sheet-status ${submission.sheetSyncStatus}`}>{statusLabel[submission.sheetSyncStatus] || submission.sheetSyncStatus}</span></span><p>{answerPreview(submission.answers)}</p><span className="mobile-response-meta"><time>{new Date(submission.submittedAt).toLocaleString('ko-KR')}</time>{project ? <span>자세히 보기 <ArrowRight /></span> : null}</span></>
              return project ? <Link key={submission.id} to={`/responses/${project.id}`}>{content}</Link> : <article key={submission.id}>{content}</article>
            })}</div> : null}
            {pageCount > 1 ? <footer className="response-pagination"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>이전</button><span>{page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>다음</button></footer> : null}
          </section>
        </> : null}
      </main>
    </AppFrame>
  )
}
