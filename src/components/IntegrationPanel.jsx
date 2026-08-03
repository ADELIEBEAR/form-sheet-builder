import { ArrowSquareOut, Check, GoogleLogo, LinkSimple, SpinnerGap } from '@phosphor-icons/react'
import { useState } from 'react'
import { api } from '../lib/api'

export default function IntegrationPanel({ projectId, project, onConnected }) {
  const [sheetId, setSheetId] = useState(project.sheetId || '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function connect(action) {
    setBusy(action)
    setError('')
    try {
      const data = await api(`/maker/projects/${projectId}/sheet`, { method: 'POST', body: JSON.stringify({ action, sheetId: action === 'link' ? sheetId.trim() : undefined }) })
      onConnected(data.project)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="inspector-panel">
      <div className="panel-heading"><span>Google Sheets</span><strong>응답 자동 기록</strong><p>새 응답은 Supabase에 먼저 저장한 후 시트에 기록됩니다.</p></div>
      {!projectId ? <div className="info-box">폼을 먼저 저장하면 Google Sheet를 연결할 수 있습니다.</div> : null}
      {projectId && project.sheetId ? <div className="sheet-connected"><div className="sheet-icon"><GoogleLogo weight="bold" /></div><div><span><Check weight="bold" /> 연결됨</span><strong>{project.sheetName || '응답'}</strong><small>새 질문을 저장하면 첫 행 제목도 갱신됩니다.</small></div><a href={project.sheetUrl} target="_blank" rel="noreferrer" aria-label="연결된 시트 열기"><ArrowSquareOut /></a></div> : null}
      {projectId && !project.sheetId ? <div className="sheet-connect-actions"><button className="studio-primary full" type="button" onClick={() => connect('create')} disabled={Boolean(busy)}>{busy === 'create' ? <SpinnerGap className="spin" /> : <GoogleLogo weight="bold" />} 새 시트 만들어 연결</button><div className="or-line"><span>또는</span></div><label className="studio-control"><span>기존 Google Sheet</span><input value={sheetId} onChange={(event) => setSheetId(event.target.value)} placeholder="시트 주소 또는 ID" /></label><button className="studio-secondary full" type="button" onClick={() => connect('link')} disabled={!sheetId.trim() || Boolean(busy)}>{busy === 'link' ? <SpinnerGap className="spin" /> : <LinkSimple />} 기존 시트 연결</button></div> : null}
      {error ? <div className="inline-alert">{error}</div> : null}
    </div>
  )
}
