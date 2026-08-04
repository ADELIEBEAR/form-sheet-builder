import { CheckCircle, Key, LockKey, SpinnerGap } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function ResponseLockSettings({ projectId, enabled = false, onChange }) {
  const [nextEnabled, setNextEnabled] = useState(Boolean(enabled))
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setNextEnabled(Boolean(enabled)), [enabled])

  async function saveLock() {
    if (!projectId) {
      setError('폼을 먼저 저장한 뒤 잠금을 설정해 주세요.')
      return
    }
    if (nextEnabled && pin && pin !== confirmPin) {
      setError('PIN 확인 값이 서로 다릅니다.')
      return
    }
    if (nextEnabled && !enabled && !pin) {
      setError('처음 잠글 때는 PIN을 입력해 주세요.')
      return
    }

    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const data = await api(`/maker/projects/${projectId}/response-lock`, {
        method: 'POST',
        body: JSON.stringify({ enabled: nextEnabled, pin: pin || undefined }),
      })
      onChange?.(data.enabled)
      setPin('')
      setConfirmPin('')
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1600)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="inspector-panel response-lock-settings">
      <div className="panel-heading"><span>관리자 보안</span><strong>응답 화면 잠금</strong><p>응답은 폼 소유자 로그인으로 보호됩니다. 필요하면 숫자 PIN을 한 번 더 요구할 수 있습니다.</p></div>
      <div className="admin-only-badge"><LockKey weight="fill" /><span><strong>관리자 전용</strong><small>공개 폼에서는 응답을 볼 수 없습니다</small></span><CheckCircle weight="fill" /></div>
      <label className="toggle-control lock-toggle"><input type="checkbox" checked={nextEnabled} onChange={(event) => { setNextEnabled(event.target.checked); setSaved(false); setError('') }} /><span><i />추가 PIN 잠금 사용</span></label>
      {nextEnabled ? <div className="pin-fields">
        <label className="studio-control"><span>{enabled ? '새 PIN (바꿀 때만)' : 'PIN'}</span><div className="pin-input"><Key /><input inputMode="numeric" type="password" autoComplete="new-password" maxLength="8" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="숫자 4~8자리" /></div></label>
        {pin ? <label className="studio-control"><span>PIN 확인</span><input inputMode="numeric" type="password" autoComplete="new-password" maxLength="8" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} placeholder="한 번 더 입력" /></label> : null}
      </div> : null}
      {error ? <p className="inline-error">{error}</p> : null}
      <button className="lock-save-button" type="button" onClick={saveLock} disabled={saving || (nextEnabled === enabled && !pin)}>{saving ? <SpinnerGap className="spin" /> : saved ? <CheckCircle weight="fill" /> : <LockKey />}{saved ? '저장됨' : '잠금 설정 저장'}</button>
    </section>
  )
}
