import { Navigate, Route, Routes } from './lib/router'
import { useAuth } from './lib/auth'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import PublicForm from './pages/PublicForm'
import Responses from './pages/Responses'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loader"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-line" /></div>
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/builder/new" element={<Protected><Builder /></Protected>} />
      <Route path="/builder/:formId" element={<Protected><Builder /></Protected>} />
      <Route path="/responses/:formId" element={<Protected><Responses /></Protected>} />
      <Route path="/f/:slug" element={<PublicForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
