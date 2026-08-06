import { ArrowSquareOut, CheckCircle, GoogleLogo, LinkBreak, SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function PersonalSheetPanel({ projectId }) {
  const { connectGoogleSheets } = useAuth()
  const [sheet, setSheet] = useState(null)
  const [automaticRefreshReady, setAutomaticRefreshReady] = useState(true)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await api(`/maker/projects/${projectId}/personal-sheet`)
      setSheet(data.personalSheet || null)
      setAutomaticRefreshReady(data.automaticRefreshReady !== false)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const connect = useCallback(async ({ reauthorize = true } = {}) => {
    if (!projectId || working) return
    setWorking(true)
    setError('')
    try {
      const data = await api(`/maker/projects/${projectId}/personal-sheet`, { method: 'POST' })
      setSheet(data.personalSheet || null)
      setAutomaticRefreshReady(data.automaticRefreshReady !== false)
    } catch (caught) {
      if (reauthorize && [401, 403].includes(Number(caught.status))) {
        await connectGoogleSheets(`${window.location.pathname}?connectSheet=1`)
        return
      }
      setError(caught.message)
    } finally {
      setWorking(false)
    }
  }, [connectGoogleSheets, projectId, working])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!projectId) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('connectSheet') !== '1') return
    params.delete('connectSheet')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    connect({ reauthorize: false })
  }, [connect, projectId])

  async function disconnect() {
    if (!projectId || working) return
    setWorking(true)
    setError('')
    try {
      await api(`/maker/projects/${projectId}/personal-sheet`, { method: 'DELETE' })
      setSheet(null)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="inspector-panel personal-sheet-panel">
      <div className="panel-heading">
        <span>MY GOOGLE SHEET</span>
        <strong>내 Google 시트</strong>
        <p>이 폼 전용 시트를 내 Google 계정에 만들고 새 응답을 자동으로 추가합니다.</p>
      </div>

      {loading ? <div className="personal-sheet-loading"><SpinnerGap className="spin" /> 연결 상태 확인 중</div> : null}

      {!loading && sheet ? (
        <div className={`personal-sheet-card ${sheet.status || 'connected'}`}>
          <div className="personal-sheet-card-icon"><GoogleLogo weight="bold" /></div>
          <div className="personal-sheet-card-copy">
            <span><CheckCircle weight="fill" /> 연결됨</span>
            <strong>{sheet.sheetTitle || '폼 응답 시트'}</strong>
            <small>{sheet.googleEmail || '현재 Google 계정'}</small>
          </div>
          <a href={sheet.sheetUrl} target="_blank" rel="noreferrer" aria-label="연결된 Google 시트 열기"><ArrowSquareOut /></a>
        </div>
      ) : null}

      {!loading && !sheet ? (
        <div className="personal-sheet-empty">
          <GoogleLogo weight="bold" />
          <div><strong>아직 연결된 개인 시트가 없어요</strong><small>연결하면 이 폼 이름으로 새 스프레드시트가 자동 생성됩니다.</small></div>
        </div>
      ) : null}

      {sheet?.lastError ? <div className="personal-sheet-warning"><WarningCircle /> <span>{sheet.lastError}</span></div> : null}
      {sheet && !automaticRefreshReady ? <div className="personal-sheet-warning"><WarningCircle /> <span>장기 자동 저장 설정을 확인해야 합니다. 권한 만료 시 다시 연결이 필요할 수 있어요.</span></div> : null}
      {error ? <div className="personal-sheet-error"><WarningCircle /> <span>{error}</span></div> : null}

      <div className="personal-sheet-actions">
        {sheet ? (
          <>
            <button className="personal-sheet-reconnect" type="button" onClick={() => connect()} disabled={working}>{working ? <SpinnerGap className="spin" /> : <GoogleLogo />} 권한 다시 연결</button>
            <button className="personal-sheet-disconnect" type="button" onClick={disconnect} disabled={working}><LinkBreak /> 연결 해제</button>
          </>
        ) : (
          <button className="personal-sheet-connect" type="button" onClick={() => connect()} disabled={working || !projectId}>{working ? <SpinnerGap className="spin" /> : <GoogleLogo weight="bold" />} {working ? '시트 만드는 중' : '내 Google 시트 만들기'}</button>
        )}
      </div>
      <small className="personal-sheet-footnote">연결을 해제해도 이미 만들어진 Google 시트와 저장된 응답은 삭제되지 않습니다.</small>
    </div>
  )
}
