import { Key, LockKey, ShieldCheck, SpinnerGap, UsersThree } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function ResponseAdminGate({ onUnlocked }) {
  const [mode, setMode] = useState('loading')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api('/maker/admin/status')
      .then((data) => {
        if (!active) return
        if (data.unlocked) onUnlocked?.()
        else setMode(data.configured ? 'unlock' : 'setup')
      })
      .catch((caught) => { if (active) { setError(caught.message); setMode('unlock') } })
    return () => { active = false }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (mode === 'setup' && pin !== confirmPin) {
      setError('PIN 확인 값이 서로 다릅니다.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api(mode === 'setup' ? '/maker/admin/setup' : '/maker/admin/unlock', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      setPin('')
      setConfirmPin('')
      onUnlocked?.()
    } catch (caught) {
      setError(caught.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'loading') return <div className="responses-loading"><div /><div /><div /></div>

  const setup = mode === 'setup'
  return (
    <section className="response-lock-gate response-admin-gate">
      <div className="lock-gate-icon"><LockKey weight="fill" /></div>
      <span>응답 관리자 전용</span>
      <h1>{setup ? '관리자 PIN을 처음 설정하세요' : '응답 관리자 로그인'}</h1>
      <p>{setup ? '공용 Google 계정과 별도로 사용할 관리자 PIN입니다. 이 PIN을 아는 사람만 응답 원문과 내보내기 파일을 열 수 있습니다.' : '공용 Google 계정으로 로그인했더라도 관리자 PIN을 모르면 응답 내용은 서버에서 내려오지 않습니다.'}</p>
      <div className="admin-gate-note"><UsersThree /><span><strong>폼 제작 계정은 함께 사용</strong><small>응답 권한은 관리자 PIN으로 분리</small></span><ShieldCheck weight="fill" /></div>
      <form className={setup ? 'admin-setup-form' : ''} onSubmit={submit}>
        <label><Key /><input inputMode="numeric" type="password" autoFocus autoComplete={setup ? 'new-password' : 'current-password'} minLength="6" maxLength="12" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="관리자 PIN 6~12자리" aria-label="관리자 PIN" /></label>
        {setup ? <label><Key /><input inputMode="numeric" type="password" autoComplete="new-password" minLength="6" maxLength="12" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} placeholder="관리자 PIN 한 번 더" aria-label="관리자 PIN 확인" /></label> : null}
        <button type="submit" disabled={submitting || pin.length < 6 || (setup && confirmPin.length < 6)}>{submitting ? <SpinnerGap className="spin" /> : <LockKey weight="fill" />}{setup ? 'PIN 설정하고 응답 열기' : '관리자 로그인'}</button>
      </form>
      {error ? <p className="inline-error admin-gate-error">{error}</p> : null}
      <small className="admin-session-copy">인증은 현재 브라우저 탭에서 최대 8시간 유지됩니다.</small>
    </section>
  )
}
