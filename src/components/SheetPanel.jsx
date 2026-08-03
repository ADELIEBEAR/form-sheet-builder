import { ArrowSquareOut, Check, GoogleLogo, LinkSimple, SpinnerGap } from '@phosphor-icons/react'
import { useState } from 'react'
import { api } from '../lib/api'

export default function SheetPanel({ formId, form, onConnected }) {
  const [sheetId, setSheetId] = useState(form.sheetId || '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function connect(action) {
    setBusy(action)
    setError('')
    try {
      const data = await api(`/api/forms/${formId}/sheet`, { method: 'POST', body: JSON.stringify({ action, sheetId: action === 'link' ? sheetId.trim() : undefined }) })
      onConnected(data.form)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="settings-section">
      <div className="settings-heading"><div className="settings-icon"><GoogleLogo size={21} weight="bold" /></div><div><h3>Google Sheets</h3><p>새 응답을 시트의 다음 행에 자동으로 추가합니다.</p></div></div>
      {form.sheetId ? (
        <div className="connected-sheet">
          <div><span className="connection-label"><Check weight="bold" /> 연결됨</span><strong>{form.sheetName || '응답'}</strong></div>
          <a className="button secondary" href={form.sheetUrl} target="_blank" rel="noreferrer">시트 열기 <ArrowSquareOut /></a>
        </div>
      ) : (
        <div className="sheet-actions">
          <button className="button primary" type="button" onClick={() => connect('create')} disabled={Boolean(busy)}>{busy === 'create' ? <SpinnerGap className="spin" /> : <GoogleLogo />} 새 시트 만들기</button>
          <div className="inline-connect"><input value={sheetId} onChange={(event) => setSheetId(event.target.value)} placeholder="기존 Google Sheet 주소 또는 ID" /><button className="button secondary" type="button" onClick={() => connect('link')} disabled={!sheetId.trim() || Boolean(busy)}>{busy === 'link' ? <SpinnerGap className="spin" /> : <LinkSimple />} 연결</button></div>
        </div>
      )}
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  )
}
