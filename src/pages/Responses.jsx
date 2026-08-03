import { ArrowClockwise, ArrowSquareOut, DownloadSimple, SpinnerGap } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from '../lib/router'
import AppFrame from '../components/AppFrame'
import { api, downloadCsv } from '../lib/api'
import { allFields, responseRows } from '../lib/maker'

const statusLabel = { synced: '시트 저장됨', pending: '전송 대기', failed: '재전송 필요', not_connected: '시트 미연결' }

export default function Responses() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api(`/maker/projects/${projectId}`), api(`/maker/projects/${projectId}/submissions`)]).then(([projectData, submissionData]) => {
      setProject(projectData.project)
      setSubmissions(submissionData.submissions)
    }).catch((caught) => setError(caught.message)).finally(() => setLoading(false))
  }, [projectId])

  const fields = useMemo(() => allFields(project), [project])

  async function retry(submissionId) {
    setRetrying(submissionId)
    try {
      const data = await api(`/maker/projects/${projectId}/submissions/${submissionId}/sync`, { method: 'POST' })
      setSubmissions((current) => current.map((submission) => submission.id === submissionId ? data.submission : submission))
    } catch (caught) { setError(caught.message) } finally { setRetrying('') }
  }

  const actions = project ? <>{project.sheetUrl ? <a className="studio-secondary" href={project.sheetUrl} target="_blank" rel="noreferrer">시트 열기 <ArrowSquareOut /></a> : null}<button className="studio-primary" type="button" onClick={() => downloadCsv(`${project.title}-응답.csv`, responseRows(project, submissions))}><DownloadSimple /> CSV 내려받기</button></> : null

  return (
    <AppFrame backTo={`/studio/${projectId}`} center={project ? <strong className="response-header-title">{project.title}</strong> : null} actions={actions}>
      <main className="responses-main">
        {loading ? <div className="responses-loading"><div /><div /><div /></div> : null}
        {error ? <div className="inline-alert">{error}</div> : null}
        {!loading && project ? <div className="responses-heading"><div><h1>응답</h1><p>총 {submissions.length.toLocaleString()}개의 응답이 저장되어 있습니다.</p></div><div className="response-summary"><span>Google Sheets</span><strong>{project.sheetId ? '연결됨' : '연결되지 않음'}</strong></div></div> : null}
        {!loading && submissions.length === 0 ? <section className="response-empty"><h2>아직 들어온 응답이 없습니다</h2><p>공개 링크를 공유하면 제출된 응답이 여기에 표시됩니다.</p></section> : null}
        {submissions.length > 0 ? <div className="response-table-wrap"><table><thead><tr><th>제출 시각</th>{fields.map((field) => <th key={field.id}>{field.label}</th>)}<th>시트 상태</th></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id}><td className="date-cell">{new Date(submission.submittedAt).toLocaleString('ko-KR')}</td>{fields.map((field) => { const value = submission.answers[field.id]; return <td key={field.id}>{Array.isArray(value) ? value.join(', ') : value || <span className="empty-cell">응답 없음</span>}</td> })}<td><span className={`sheet-status ${submission.sheetSyncStatus}`}>{statusLabel[submission.sheetSyncStatus] || submission.sheetSyncStatus}</span>{submission.sheetSyncStatus === 'failed' ? <button className="retry-sync" type="button" onClick={() => retry(submission.id)} disabled={retrying === submission.id}>{retrying === submission.id ? <SpinnerGap className="spin" /> : <ArrowClockwise />} 재전송</button> : null}</td></tr>)}</tbody></table></div> : null}
      </main>
    </AppFrame>
  )
}
