import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)
const PRODUCTION_ORIGIN = 'https://form-maker-next.vercel.app'
let ephemeralGoogleTokens = { providerToken: '', providerRefreshToken: '' }

function rememberEphemeralGoogleTokens(session) {
  if (!session?.provider_token) return
  ephemeralGoogleTokens = {
    providerToken: session.provider_token,
    providerRefreshToken: session.provider_refresh_token || '',
  }
}

export function getEphemeralGoogleTokens() {
  return { ...ephemeralGoogleTokens }
}

function authReturnUrl(returnTo) {
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const origin = localHost ? window.location.origin : PRODUCTION_ORIGIN
  const path = String(returnTo || '/workspace').startsWith('/') ? String(returnTo || '/workspace') : '/workspace'
  return `${origin}${path}`
}

function mapUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    // Older builds cached Google provider tokens in browser storage. The
    // personal-sheet flow now sends them directly to a trusted Edge Function.
    window.localStorage.removeItem('form_maker_google_provider_token')
    window.localStorage.removeItem('form_maker_google_provider_refresh_token')
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      rememberEphemeralGoogleTokens(data.session)
      setUser(mapUser(data.session?.user))
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      rememberEphemeralGoogleTokens(session)
      setUser(mapUser(session?.user))
      setLoading(false)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login: async (returnTo = '/workspace') => {
      window.localStorage.setItem('form_maker_return_to', returnTo)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authReturnUrl(returnTo),
          scopes: 'openid email profile',
          queryParams: { include_granted_scopes: 'true' },
        },
      })
      if (error) throw error
    },
    connectGoogleSheets: async (returnTo = '/workspace') => {
      window.localStorage.setItem('form_maker_return_to', returnTo)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authReturnUrl(returnTo),
          scopes: 'openid email profile https://www.googleapis.com/auth/drive.file',
          queryParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
        },
      })
      if (error) throw error
    },
    logout: async () => {
      await supabase.auth.signOut()
      ephemeralGoogleTokens = { providerToken: '', providerRefreshToken: '' }
      window.sessionStorage.removeItem('form-maker-response-admin-token')
      window.location.href = '/'
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
