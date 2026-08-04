import { ArrowRight, CheckCircle, Clock, MagnifyingGlass, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import AppFrame from '../components/AppFrame'
import WorkspaceSidebar from '../components/WorkspaceSidebar'
import { api } from '../lib/api'
import { Link } from '../lib/router'

const statusLabel = { synced: '시트 저장됨', pending: '전송 대기', failed: '재전송 필요', not_connected: '시트 미연결' }

function answerPreview(answers) {
  const values = Object.values(answers || {}).flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean)
  return values.slice(0, 3).join(' · ') || '응답 내용 없음'
}

export default function AllResponses() {
  const [projects, setProjects] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    Promise.all([api('/maker/projects'), api('/maker/submissions')])
      .then(([projectData, submissionData]) => {
        setProjects(projectData.projects)
        setSubmissions(submissionData.submissions)
      })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project])), [projects])
  const filtered = useMemo(() => submissions.filter((submission) => {
    const project = projectMap[submission.projectId]
    const matchesProject = projectFilter === 'all' || submission.projectId === projectFilter
    const text = `${project?.title || ''} ${answerPreview(submission.answers)}`.toLowerCase()
    return matchesProject && text.includes(query.trim().toLowerCase())
  }), [projectFilter, projectMap, query, submissions])
  const failed = submissions.filter((submission) => submission.sheetSyncStatus === 'failed').length
  const pending = submissions.filter((submission) => submission.sheetSyncStatus === 'pending').length
  const pageSize = 50
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [projectFilter, query])

  return (
    <AppFrame sidebar={<WorkspaceSidebar active="responses" />}>
      <main className="workspace-main all-responses-main">
        <div className="workspace-heading"><div><span className="page-eyebrow">한곳에서 확인</span><h1>전체 응답</h1><p>모든 폼에 들어온 답변과 Google Sheets 전송 상태를 함께 확인하세요.</p></div></div>
        {error ? <div className="inline-alert">{error}</div> : null}
        {loading ? <div className="response-overview-loading"><i /><i /><i /></div> : null}
        {!loading ? <>
          <section className="response-overview" aria-label="응답 요약">
            <article><span>전체 응답</span><strong>{submissions.length.toLocaleString()}</strong><small>{projects.length.toLocaleString()}개 폼에서 수집</small></article>
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
            {pageCount > 1 ? <footer className="response-pagination"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>이전</button><span>{page} / {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>다음</button></footer> : null}
          </section>
        </> : null}
      </main>
    </AppFrame>
  )
}
