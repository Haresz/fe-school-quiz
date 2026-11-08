import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthApiError, mapAuthError } from './auth-errors'

export type SignUpInput = {
  email: string
  password: string
  displayName?: string
}

export type SignInResult = {
  session: Session
  profileReady: boolean
}

export type SignUpResult = {
  session: Session | null
  user: User | null
  needsEmailConfirmation: boolean
  profileReady: boolean
}

export type AuthSubscription = {
  unsubscribe: () => void
}

function resolveDisplayName(user: User, fallback?: string): string {
  const metadataName = user.user_metadata?.display_name
  const candidates = [
    typeof metadataName === 'string' ? metadataName : undefined,
    fallback,
    user.email?.split('@')[0],
    'Pembuat kuis',
  ]

  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed) return trimmed.slice(0, 80)
  }

  return 'Pembuat kuis'
}

async function ensureProfile(user: User, fallbackDisplayName?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (error) return false
    if (data) return true

    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        display_name: resolveDisplayName(user, fallbackDisplayName),
        role: 'creator',
      },
      { onConflict: 'id' },
    )

    return !upsertError
  } catch {
    return false
  }
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw mapAuthError(error)
  if (!data.session) throw new AuthApiError('unknown')

  const profileReady = data.user ? await ensureProfile(data.user) : true
  return { session: data.session, profileReady }
}

export async function signUp({
  email,
  password,
  displayName,
}: SignUpInput): Promise<SignUpResult> {
  const trimmedName = displayName?.trim()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: trimmedName ? { display_name: trimmedName } : undefined,
      emailRedirectTo: `${window.location.origin}/login`,
    },
  })

  if (error) throw mapAuthError(error)

  const profileReady =
    data.session && data.user ? await ensureProfile(data.user, trimmedName) : false

  return {
    session: data.session,
    user: data.user,
    needsEmailConfirmation: !data.session,
    profileReady,
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw mapAuthError(error)
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw mapAuthError(error)
  return data.session
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): AuthSubscription {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return data.subscription
}
