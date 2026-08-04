import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

function mapUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
  }
}

async function rememberGoogleTokens(session) {
  if (!session?.user || !session.provider_token) return
  window.localStorage.setItem('form_maker_google_provider_token', session.provider_token)
  if (session.provider_refresh_token) window.localStorage.setItem('form_maker_google_provider_refresh_token', session.provider_refresh_token)
  const payload = {
    user_id: session.user.id,
    access_token: session.provider_token,
    updated_at: new Date().toISOString(),
  }
  if (session.provider_refresh_token) payload.refresh_token = session.provider_refresh_token
  await supabase.from('form_maker_google_tokens').upsert(payload, { onConflict: 'user_id' })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(mapUser(data.session?.user))
      rememberGoogleTokens(data.session).catch(() => {})
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(mapUser(session?.user))
      rememberGoogleTokens(session).catch(() => {})
      setLoading(false)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login: async (returnTo = '/workspace') => {
      window.localStorage.setItem('form_maker_return_to', returnTo)
      const redirectTo = `${window.location.origin}${returnTo}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          scopes: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
          queryParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
        },
      })
      if (error) throw error
    },
    logout: async () => {
      await supabase.auth.signOut()
      window.sessionStorage.removeItem('form-maker-response-admin-token')
      window.localStorage.removeItem('form_maker_google_provider_token')
      window.localStorage.removeItem('form_maker_google_provider_refresh_token')
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
