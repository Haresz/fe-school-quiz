import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getSession,
  onAuthStateChange,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  type SignUpInput,
} from '@/api/auth'
import { AuthContext, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false
    let receivedEvent = false

    const applySession = (next: Session | null) => {
      if (cancelled) return
      setSession(next)
      setStatus(next ? 'authenticated' : 'unauthenticated')
    }

    const subscription = onAuthStateChange((next) => {
      receivedEvent = true
      applySession(next)
    })

    void getSession()
      .then((next) => {
        if (!receivedEvent) applySession(next)
      })
      .catch(() => {
        if (!receivedEvent) applySession(null)
      })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInRequest(email, password)
    setSession(result.session)
    setStatus('authenticated')
    return result
  }, [])

  const signUp = useCallback(async (input: SignUpInput) => {
    const result = await signUpRequest(input)
    if (result.session) {
      setSession(result.session)
      setStatus('authenticated')
    }
    return result
  }, [])

  const signOut = useCallback(async () => {
    try {
      await signOutRequest()
    } catch {
      // State lokal tetap dibersihkan agar pengguna tidak terjebak.
    } finally {
      setSession(null)
      setStatus('unauthenticated')
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      signIn,
      signUp,
      signOut,
    }),
    [session, status, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
