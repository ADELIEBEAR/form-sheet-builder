import { Children, createContext, useContext, useEffect, useMemo, useState } from 'react'

const RouterContext = createContext(null)
const ParamsContext = createContext({})

export function BrowserRouter({ children }) {
  const [location, setLocation] = useState(() => ({ pathname: window.location.pathname, search: window.location.search }))

  useEffect(() => {
    const update = () => setLocation({ pathname: window.location.pathname, search: window.location.search })
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  const value = useMemo(() => ({
    location,
    navigate(to, options = {}) {
      if (options.replace) window.history.replaceState(null, '', to)
      else window.history.pushState(null, '', to)
      setLocation({ pathname: window.location.pathname, search: window.location.search })
    },
  }), [location])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

function matchPath(pattern, pathname) {
  if (pattern === '*') return { params: {} }
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params = {}
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index]
    const actual = pathParts[index]
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(actual)
    else if (expected !== actual) return null
  }
  return { params }
}

export function Routes({ children }) {
  const { location } = useRouter()
  for (const child of Children.toArray(children)) {
    const match = matchPath(child.props.path, location.pathname)
    if (match) return <ParamsContext.Provider value={match.params}>{child.props.element}</ParamsContext.Provider>
  }
  return null
}

export function Route() {
  return null
}

export function Navigate({ to, replace = false }) {
  const navigate = useNavigate()
  useEffect(() => { navigate(to, { replace }) }, [navigate, replace, to])
  return null
}

export function Link({ to, onClick, children, ...props }) {
  const navigate = useNavigate()
  return <a href={to} {...props} onClick={(event) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target) return
    event.preventDefault()
    navigate(to)
  }}>{children}</a>
}

export function useNavigate() {
  return useRouter().navigate
}

export function useParams() {
  return useContext(ParamsContext)
}

function useRouter() {
  const context = useContext(RouterContext)
  if (!context) throw new Error('Router components must be used inside BrowserRouter')
  return context
}
