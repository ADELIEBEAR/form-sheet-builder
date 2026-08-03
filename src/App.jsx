import { Navigate, Route, Routes } from './lib/router'
import { useAuth } from './lib/auth'
import Landing from './pages/Landing'
import Workspace from './pages/Workspace'
import Studio from './pages/Studio'
import PublicForm from './pages/PublicForm'
import Responses from './pages/Responses'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('studio-preview')) return children
  if (loading) return <div className="route-loading"><div /><span>폼메이커를 준비하고 있습니다</span></div>
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/workspace" element={<Protected><Workspace /></Protected>} />
      <Route path="/studio/new" element={<Protected><Studio /></Protected>} />
      <Route path="/studio/:projectId" element={<Protected><Studio /></Protected>} />
      <Route path="/responses/:projectId" element={<Protected><Responses /></Protected>} />
      <Route path="/s/:slug" element={<PublicForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
