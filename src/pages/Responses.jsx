import { ArrowClockwise, ArrowSquareOut, CaretDown, FileCsv, FileXls, ListBullets, LockKey, MagnifyingGlass, PencilSimple, SpinnerGap } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from '../lib/router'
import AppFrame from '../components/AppFrame'
import ResponseAdminGate from '../components/ResponseAdminGate'
import { api, downloadCsv } from '../lib/api'
import { allFields, responseRows } from '../lib/maker'
import { downloadXlsx } from '../lib/xlsx'
import { countQuality, QUALITY_OPTIONS, qualityLabel, qualityReasonText } from '../lib/quality'

const statusLabel = { synced: '시트 저장됨', pending: '전송 대기', failed: '재전송 필요', not_connected: '시트 미연결' }

function answerText(value) {
  if (Array.isArray(value)) return value.join(', ')
  return value == null || value === '' ? '' : String(value)
}

export default function Responses() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminReady, setAdminReady] = useState(false)
  const [retrying, setRetrying] = useState('')
  const [query, setQuery] = useState('')
  const [qualityFilter, setQualityFilter] = useState('all')
  const [updatingQuality, setUpdatingQuality] = useState('')
  const [error, setError] = useState('')

  async function loadSubmissions() {
    const data = await api(`/maker/projects/${projectId}/submissions`)
    setSubmissions(data.submissions)
  }

  useEffect(() => {
    api(`/maker/projects/${projectId}`)
      .then((data) => setProject(data.project))
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [projectId])

  const fields = useMemo(() => allFields(project), [project])
  const visible = useMemo(() => submissions.filter((submission) => {
    const haystack = Object.values(submission.answers || {}).flatMap((value) => Array.isArray(value) ? value : [value]).join(' ').toLowerCase()
    const matchesQuality = qualityFilter === 'all' || submission.qualityStatus === qualityFilter
    return matchesQuality && haystack.includes(query.trim().toLowerCase())
  }), [qualityFilter, query, submissions])
  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    return submissions.filter((submission) => new Date(submission.submittedAt) >= start).length
  }, [submissions])
  const failed = submissions.filter((submission) => submission.sheetSyncStatus === 'failed').length
  const qualityCounts = useMemo(() => countQuality(submissions), [submissions])

  async function openAdminResponses() {
    setAdminReady(true)
    setLoading(true)
    setError('')
    try {
      await loadSubmissions()
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

  async function retry(submissionId) {
    setRetrying(submissionId)
    try {
      const data = await api(`/maker/projects/${projectId}/submissions/${submissionId}/sync`, { method: 'POST' })
      setSubmissions((current) => current.map((submission) => submission.id === submissionId ? data.submission : submission))
    } catch (caught) { setError(caught.message) } finally { setRetrying('') }
  }

  async function setQuality(submissionId, status) {
    setUpdatingQuality(submissionId)
    setError('')
    try {
      const data = await api(`/maker/projects/${projectId}/submissions/${submissionId}/quality`, { method: 'PATCH', body: { status } })
      setSubmissions((current) => current.map((submission) => submission.id === submissionId ? data.submission : submission))
    } catch (caught) { setError(caught.message) } finally { setUpdatingQuality('') }
  }

  const rows = project ? responseRows(project, submissions) : []
  const actions = project && adminReady ? <div className="response-export-actions"><button className="studio-secondary response-admin-lock" type="button" onClick={lockAdminResponses}><LockKey /> 관리자 잠그기</button>{project.sheetUrl ? <a className="studio-secondary" href={project.sheetUrl} target="_blank" rel="noreferrer">시트 열기 <ArrowSquareOut /></a> : null}<button className="studio-secondary" type="button" onClick={() => downloadCsv(`${project.title}-응답.csv`, rows)}><FileCsv /> CSV</button><button className="studio-primary" type="button" onClick={() => downloadXlsx(`${project.title}-응답.xlsx`, rows)}><FileXls /> Excel</button></div> : null

  return (
    <AppFrame backTo={`/studio/${projectId}`} center={project ? <strong className="response-header-title">{project.title}</strong> : null} actions={actions}>
      <main className="responses-main response-reader">
        {loading ? <div className="responses-loading"><div /><div /><div /></div> : null}
        {error ? <div className="inline-alert">{error}</div> : null}

        {!loading && project && !adminReady ? <ResponseAdminGate onUnlocked={openAdminResponses} /> : null}

        {!loading && project && adminReady ? <>
          <div className="responses-heading response-reader-heading"><div><span className="page-eyebrow">응답 관리자 전용</span><h1>응답</h1><p>답변을 한 명씩 펼쳐 읽고, 필요한 파일 형식으로 저장하세요.</p></div><span className="response-security-chip"><LockKey weight="fill" />관리자 인증됨</span></div>
          <nav className="response-mobile-switcher" aria-label="폼과 응답 빠른 이동"><Link to={`/studio/${projectId}`}><PencilSimple weight="bold" /> 폼 수정</Link><Link to="/responses"><ListBullets weight="bold" /> 전체 응답</Link></nav>
          <section className="response-metrics quality-metrics" aria-label="응답 요약"><article><span>전체 응답</span><strong>{submissions.length.toLocaleString()}</strong><small>오늘 {today.toLocaleString()}개</small></article><article className="quality-normal"><span>정상 DB</span><strong>{qualityCounts.normal.toLocaleString()}</strong></article><article className="quality-duplicate"><span>중복 DB</span><strong>{qualityCounts.duplicate.toLocaleString()}</strong></article><article className="quality-invalid"><span>불량 DB</span><strong>{qualityCounts.invalid.toLocaleString()}</strong><small>{failed ? `시트 실패 ${failed.toLocaleString()}개` : ''}</small></article></section>
          {submissions.length ? <><nav className="quality-filter-bar compact" aria-label="DB 판정 필터">{QUALITY_OPTIONS.map((option) => <button className={qualityFilter === option.value ? `active ${option.value}` : option.value} type="button" key={option.value} onClick={() => setQualityFilter(option.value)}>{option.label}<span>{option.value === 'all' ? submissions.length : qualityCounts[option.value]}</span></button>)}</nav><div className="response-reader-tools"><label className="workspace-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="답변 내용 검색" /></label><span>{visible.length.toLocaleString()}개 표시</span></div></> : null}
          {submissions.length === 0 ? <section className="response-empty"><h2>아직 들어온 응답이 없습니다</h2><p>공개 링크를 공유하면 제출된 응답이 여기에 표시됩니다.</p></section> : null}
          {submissions.length > 0 && visible.length === 0 ? <section className="response-empty compact"><h2>검색 결과가 없습니다</h2><p>다른 검색어로 다시 찾아보세요.</p></section> : null}
          {visible.length ? <section className="response-card-list" aria-label="응답 목록">{visible.map((submission, index) => {
            const preview = fields.map((field) => answerText(submission.answers[field.id])).filter(Boolean).slice(0, 2).join(' · ') || '응답 내용 없음'
            return <details className="response-card" key={submission.id} open={index === 0}>
              <summary><span className="response-sequence">{String(index + 1).padStart(3, '0')}</span><span className="response-card-copy"><strong>{preview}</strong><small>{new Date(submission.submittedAt).toLocaleString('ko-KR')}</small></span><span className={`quality-badge ${submission.qualityStatus}`}>{qualityLabel(submission.qualityStatus)}</span><span className={`sheet-status ${submission.sheetSyncStatus}`}>{statusLabel[submission.sheetSyncStatus] || submission.sheetSyncStatus}</span><CaretDown className="response-card-caret" /></summary>
              <div className={`quality-explanation ${submission.qualityStatus}`}><strong>{qualityLabel(submission.qualityStatus)}</strong><span>{qualityReasonText(submission.qualityReasons)}</span>{submission.qualitySource === 'manual' ? <small>관리자 확인</small> : <small>자동 판정</small>}</div>
              <div className="response-answer-grid">{fields.map((field) => { const value = answerText(submission.answers[field.id]); return <article key={field.id}><span>{field.label}</span><p>{value || <em>응답 없음</em>}</p></article> })}</div>
              <footer className="response-card-footer"><div className="quality-review-controls"><span>관리자 판정</span>{QUALITY_OPTIONS.slice(1).map((option) => <button className={`${option.value}${submission.qualityStatus === option.value ? ' active' : ''}`} type="button" key={option.value} onClick={() => setQuality(submission.id, option.value)} disabled={updatingQuality === submission.id || submission.qualityStatus === option.value}>{updatingQuality === submission.id ? <SpinnerGap className="spin" /> : null}{option.label}</button>)}</div>{submission.sheetSyncStatus === 'failed' ? <button className="retry-sync" type="button" onClick={() => retry(submission.id)} disabled={retrying === submission.id}>{retrying === submission.id ? <SpinnerGap className="spin" /> : <ArrowClockwise />} Google Sheets 재전송</button> : null}</footer>
            </details>
          })}</section> : null}
        </> : null}
      </main>
    </AppFrame>
  )
}
