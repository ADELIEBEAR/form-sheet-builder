import { ArrowClockwise, ArrowSquareOut, Check, GoogleLogo, SpinnerGap } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const PENDING_CONNECTION_KEY = 'form_maker_pending_sheet_connection'

export default function IntegrationPanel({ projectId, project, onConnected }) {
  const { login } = useAuth()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false)

  async function connectAutomatically() {
    if (!projectId) return
    setBusy('auto')
    setError('')
    setNeedsGoogleAuth(false)
    try {
      const data = await api(`/maker/projects/${projectId}/sheet`, { method: 'POST', body: JSON.stringify({ action: 'auto' }) })
      window.localStorage.removeItem(PENDING_CONNECTION_KEY)
      onConnected(data.project)
    } catch (caught) {
      setError(caught.message)
      setNeedsGoogleAuth(caught.status === 401)
    } finally {
      setBusy('')
    }
  }

  useEffect(() => {
    if (!projectId || project.sheetId) return
    connectAutomatically()
  }, [projectId, project.sheetId])

  async function reconnectGoogle() {
    window.localStorage.setItem(PENDING_CONNECTION_KEY, JSON.stringify({ projectId, action: 'auto' }))
    setBusy('auth')
    setError('')
    try {
      await login(`${window.location.pathname}${window.location.search}`)
    } catch (caught) {
      window.localStorage.removeItem(PENDING_CONNECTION_KEY)
      setError(caught.message)
      setBusy('')
    }
  }

  return (
    <div className="inspector-panel">
      <div className="panel-heading"><span>자동 백업</span><strong>Google Sheets 자동 기록</strong><p>별도 연결 없이 모든 폼 응답을 내 백업시트에 자동으로 정리합니다.</p></div>
      {!projectId ? <div className="info-box">폼을 처음 저장하면 백업시트와 폼 전용 탭이 자동으로 만들어집니다.</div> : null}
      {projectId && busy === 'auto' ? <div className="sheet-auto-status"><SpinnerGap className="spin" /><div><strong>백업시트 준비 중</strong><small>처음 한 번만 자동으로 만들고 있습니다.</small></div></div> : null}
      {projectId && project.sheetId ? <div className="sheet-connected"><div className="sheet-icon"><GoogleLogo weight="bold" /></div><div><span><Check weight="bold" /> 자동 백업 중</span><strong>폼메이커 응답 백업</strong><small>이 폼의 탭 · {project.sheetName || '응답'}</small></div><a href={project.sheetUrl} target="_blank" rel="noreferrer" aria-label="자동 백업시트 열기"><ArrowSquareOut /></a></div> : null}
      {projectId && !project.sheetId && !busy && !error ? <button className="studio-secondary full" type="button" onClick={connectAutomatically}><ArrowClockwise /> 자동 백업 다시 확인</button> : null}
      {error ? <div className="inline-alert sheet-auth-alert"><span>{error}</span><button type="button" onClick={needsGoogleAuth ? reconnectGoogle : connectAutomatically} disabled={Boolean(busy)}>{busy ? <SpinnerGap className="spin" /> : <ArrowClockwise />} {needsGoogleAuth ? 'Google 권한 한 번 승인' : '다시 시도'}</button></div> : null}
    </div>
  )
}
