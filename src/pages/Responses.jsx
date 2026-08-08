import { CaretDown, FileCsv, FileXls, ListBullets, LockKey, MagnifyingGlass, PencilSimple } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from '../lib/router'
import AppFrame from '../components/AppFrame'
import ResponseAdminGate from '../components/ResponseAdminGate'
import { api, downloadCsv } from '../lib/api'
import { allFields, responseRows } from '../lib/maker'
import { downloadXlsx } from '../lib/xlsx'
import { countQuality, QUALITY_OPTIONS, qualityLabel, qualityReasonText } from '../lib/quality'
import { responseIdentity, submissionNumberMap, submissionTimeParts } from '../lib/responseIdentity'

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
  const [query, setQuery] = useState('')
  const [qualityFilter, setQualityFilter] = useState('all')
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
  const qualityCounts = useMemo(() => countQuality(submissions), [submissions])
  const sequenceById = useMemo(() => submissionNumberMap(submissions), [submissions])

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

  const rows = project ? responseRows(project, submissions) : []
  const actions = project && adminReady ? <div className="response-export-actions"><button className="studio-secondary response-admin-lock" type="button" onClick={lockAdminResponses}><LockKey /> 관리자 잠그기</button><button className="studio-secondary" type="button" onClick={() => downloadCsv(`${project.title}-응답.csv`, rows)}><FileCsv /> CSV</button><button className="studio-primary" type="button" onClick={() => downloadXlsx(`${project.title}-응답.xlsx`, rows)}><FileXls /> Excel</button></div> : null

  return (
    <AppFrame backTo={`/studio/${projectId}`} center={project ? <strong className="response-header-title">{project.title}</strong> : null} actions={actions}>
      <main className="responses-main response-reader">
        {loading ? <div className="responses-loading"><div /><div /><div /></div> : null}
        {error ? <div className="inline-alert">{error}</div> : null}

        {!loading && project && !adminReady ? <ResponseAdminGate onUnlocked={openAdminResponses} /> : null}

        {!loading && project && adminReady ? <>
          <div className="responses-heading response-reader-heading"><div><span className="page-eyebrow">응답 관리자 전용</span><h1>응답</h1><p>응답자를 카드로 빠르게 훑어보고, 필요한 답변만 펼쳐 확인하세요.</p></div><span className="response-security-chip"><LockKey weight="fill" />관리자 인증됨</span></div>
          <nav className="response-mobile-switcher" aria-label="폼과 응답 빠른 이동"><Link to={`/studio/${projectId}`}><PencilSimple weight="bold" /> 폼 수정</Link><Link to="/responses"><ListBullets weight="bold" /> 전체 응답</Link></nav>
          <section className="response-metrics quality-metrics" aria-label="응답 요약"><article><span>전체 응답</span><strong>{submissions.length.toLocaleString()}</strong><small>오늘 {today.toLocaleString()}개</small></article><article className="quality-normal"><span>정상 DB</span><strong>{qualityCounts.normal.toLocaleString()}</strong></article><article className="quality-duplicate"><span>중복 DB</span><strong>{qualityCounts.duplicate.toLocaleString()}</strong></article><article className="quality-invalid"><span>불량 DB</span><strong>{qualityCounts.invalid.toLocaleString()}</strong></article></section>
          {submissions.length ? <><nav className="quality-filter-bar compact" aria-label="DB 판정 필터">{QUALITY_OPTIONS.map((option) => <button className={qualityFilter === option.value ? `active ${option.value}` : option.value} type="button" key={option.value} onClick={() => setQualityFilter(option.value)}>{option.label}<span>{option.value === 'all' ? submissions.length : qualityCounts[option.value]}</span></button>)}</nav><div className="response-reader-tools"><label className="workspace-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름·연락처·답변 검색" /></label><span>{visible.length.toLocaleString()}개 표시</span></div></> : null}
          {submissions.length === 0 ? <section className="response-empty"><h2>아직 들어온 응답이 없습니다</h2><p>공개 링크를 공유하면 제출된 응답이 여기에 표시됩니다.</p></section> : null}
          {submissions.length > 0 && visible.length === 0 ? <section className="response-empty compact"><h2>검색 결과가 없습니다</h2><p>다른 검색어로 다시 찾아보세요.</p></section> : null}
          {visible.length ? <section className="response-card-list" aria-label="응답 목록">{visible.map((submission) => {
            const preview = fields.map((field) => answerText(submission.answers[field.id])).filter(Boolean).slice(0, 2).join(' · ') || '응답 내용 없음'
            const identity = responseIdentity(project, submission.answers)
            const submitted = submissionTimeParts(submission.submittedAt)
            const sequence = sequenceById.get(submission.id) || 0
            const displayName = identity.name === '—' ? preview : identity.name
            return <details className="response-card" key={submission.id}>
              <summary><span className="response-card-topline"><span className="response-sequence">{String(sequence).padStart(3, '0')}</span><span className={`quality-badge ${submission.qualityStatus}`}>{qualityLabel(submission.qualityStatus)}</span></span><span className="response-card-copy"><strong>{displayName}</strong><span>{identity.phone === '—' ? '연락처 없음' : identity.phone}</span><small>{submitted.date}{submitted.time ? ` · ${submitted.time}` : ''}</small></span><span className="response-card-open-label"><span>답변 보기</span><span>답변 접기</span></span><CaretDown className="response-card-caret" /></summary>
              <div className={`quality-explanation ${submission.qualityStatus}`}><strong>{qualityLabel(submission.qualityStatus)}</strong><span>{qualityReasonText(submission.qualityReasons)}</span><small>자동 판정</small></div>
              <div className="response-answer-grid">{fields.map((field) => { const value = answerText(submission.answers[field.id]); return <article key={field.id}><span>{field.label}</span><p>{value || <em>응답 없음</em>}</p></article> })}</div>
            </details>
          })}</section> : null}
        </> : null}
      </main>
    </AppFrame>
  )
}
