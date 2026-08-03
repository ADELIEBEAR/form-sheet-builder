import { ArrowLeft, CaretDown, SignOut } from '@phosphor-icons/react'
import { Link } from '../lib/router'
import { useAuth } from '../lib/auth'

export default function AppFrame({ children, backTo, center, actions, sidebar }) {
  const { user, logout } = useAuth()
  return (
    <div className="maker-app">
      <header className="maker-header">
        <div className="maker-header-left">
          {backTo ? <Link className="square-button" to={backTo} aria-label="뒤로 가기"><ArrowLeft /></Link> : null}
          <Link className="maker-logo" to="/workspace"><span className="maker-glyph"><i /><i /><i /></span><strong>폼메이커</strong></Link>
        </div>
        <div className="maker-header-center">{center}</div>
        <div className="maker-header-actions">
          {actions}
          <details className="account-menu">
            <summary><span className="account-avatar">{(user?.name || 'U').slice(0, 1).toUpperCase()}</span><span>{user?.name}</span><CaretDown /></summary>
            <div><span>{user?.email}</span><button type="button" onClick={logout}><SignOut /> 로그아웃</button></div>
          </details>
        </div>
      </header>
      <div className={sidebar ? 'maker-body with-sidebar' : 'maker-body'}>
        {sidebar}
        {children}
      </div>
    </div>
  )
}
