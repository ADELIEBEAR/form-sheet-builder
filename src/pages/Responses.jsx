import { ArrowClockwise, ArrowSquareOut, DownloadSimple, SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from '../lib/router'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
import { api, downloadCsv } from '../lib/api'
import { responseRows } from '../lib/form'

const statusLabel = {
  synced: '시트 저장됨',
  pending: '전송 중',
  failed: '재전송 필요',
  not_connected: '시트 미연결',
}

export default function Responses() {
  const { formId } = useParams()
  const [form, setForm] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api(`/api/forms/${formId}`), api(`/api/forms/${formId}/responses`)]).then(([formData, responseData]) => { setForm(formData.form); setResponses(responseData.responses) }).catch((caught) => setError(caught.message)).finally(() => setLoading(false))
  }, [formId])

  const questions = useMemo(() => form?.questions.filter((question) => question.type !== 'notice') || [], [form])

  async function retry(responseId) {
    setRetrying(responseId)
    try {
      const data = await api(`/api/forms/${formId}/responses/${responseId}/retry`, { method: 'POST' })
      setResponses((current) => current.map((response) => response.id === responseId ? data.response : response))
    } catch (caught) {
      setError(caught.message)
    } finally {
      setRetrying('')
    }
  }

  const actions = form ? <>{form.sheetUrl ? <a className="button secondary compact" href={form.sheetUrl} target="_blank" rel="noreferrer">시트 열기 <ArrowSquareOut /></a> : null}<button className="button primary compact" type="button" onClick={() => downloadCsv(`${form.title}-응답.csv`, responseRows(form, responses))}><DownloadSimple /> CSV</button></> : null

  return (
    <AppShell backTo={form ? `/builder/${formId}` : '/dashboard'} actions={actions}>
      <main className="responses-page container wide">
        {loading ? <><div className="skeleton skeleton-title" /><div className="skeleton table-skeleton" /></> : null}
        {error ? <div className="error-panel"><WarningCircle /> {error}</div> : null}
        {!loading && form ? <div className="page-heading"><div><h1>{form.title}</h1><p>총 {responses.length.toLocaleString()}개의 응답</p></div></div> : null}
        {!loading && responses.length === 0 ? <EmptyState title="아직 응답이 없습니다" body="공개 링크를 공유하면 새 응답이 여기에 쌓입니다." /> : null}
        {responses.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>제출 시각</th>{questions.map((question) => <th key={question.id}>{question.label}</th>)}<th>Google Sheets</th></tr></thead>
              <tbody>{responses.map((response) => <tr key={response.id}><td className="date-cell">{new Date(response.submittedAt).toLocaleString('ko-KR')}</td>{questions.map((question) => { const value = response.answers[question.id]; return <td key={question.id}>{Array.isArray(value) ? value.join(', ') : value || <span className="empty-value">응답 없음</span>}</td> })}<td><span className={`sync-status ${response.sheetSyncStatus}`}>{statusLabel[response.sheetSyncStatus] || response.sheetSyncStatus}</span>{response.sheetSyncStatus === 'failed' ? <button className="retry-button" type="button" onClick={() => retry(response.id)} disabled={retrying === response.id}>{retrying === response.id ? <SpinnerGap className="spin" /> : <ArrowClockwise />} 재전송</button> : null}</td></tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </main>
    </AppShell>
  )
}
