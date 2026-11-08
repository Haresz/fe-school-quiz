import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { SignInResult, SignUpInput, SignUpResult } from '@/api/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  session: Session | null
  user: User | null
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<SignInResult>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider')
  }
  return context
}
