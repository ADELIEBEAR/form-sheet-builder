import { Files, FolderOpen, LockKey } from '@phosphor-icons/react'
import { Link } from '../lib/router'

export default function WorkspaceSidebar({ active = 'forms' }) {
  return (
    <>
      <aside className="workspace-sidebar">
        <nav aria-label="작업 공간 메뉴">
          <Link className={active === 'forms' ? 'active' : ''} to="/workspace"><FolderOpen weight={active === 'forms' ? 'fill' : 'regular'} /> 내 폼</Link>
          <Link className={active === 'templates' ? 'active' : ''} to="/templates"><Files weight={active === 'templates' ? 'fill' : 'regular'} /> 템플릿</Link>
          <Link className={active === 'responses' ? 'active' : ''} to="/responses"><LockKey weight={active === 'responses' ? 'fill' : 'regular'} /> 응답 관리자</Link>
        </nav>
        <div className="workspace-note"><strong>응답 저장 원칙</strong><p>제출된 내용은 시트보다 먼저 안전하게 보관됩니다.</p></div>
      </aside>
      <nav className="mobile-workspace-nav" aria-label="모바일 작업 공간 메뉴">
        <Link className={active === 'forms' ? 'active' : ''} to="/workspace"><FolderOpen weight={active === 'forms' ? 'fill' : 'regular'} /><span>내 폼</span></Link>
        <Link className={active === 'templates' ? 'active' : ''} to="/templates"><Files weight={active === 'templates' ? 'fill' : 'regular'} /><span>템플릿</span></Link>
        <Link className={active === 'responses' ? 'active' : ''} to="/responses"><LockKey weight={active === 'responses' ? 'fill' : 'regular'} /><span>응답</span></Link>
      </nav>
    </>
  )
}
