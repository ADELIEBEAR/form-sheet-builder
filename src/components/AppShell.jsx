import { ArrowLeft, SignOut, SquaresFour } from '@phosphor-icons/react'
import { Link } from '../lib/router'
import { useAuth } from '../lib/auth'

export default function AppShell({ children, backTo, actions }) {
  const { user, logout } = useAuth()
  return (
    <div className="app-canvas">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="header-cluster">
            {backTo ? <Link className="icon-button" to={backTo} aria-label="뒤로 가기"><ArrowLeft size={20} /></Link> : null}
            <Link className="brand" to="/dashboard"><span className="brand-mark"><SquaresFour weight="fill" /></span><span>폼메이커</span></Link>
          </div>
          <div className="header-actions">
            {actions}
            <div className="user-chip"><img src={user?.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`} alt="" /><span>{user?.name}</span></div>
            <button className="icon-button" type="button" onClick={logout} aria-label="로그아웃"><SignOut size={20} /></button>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
