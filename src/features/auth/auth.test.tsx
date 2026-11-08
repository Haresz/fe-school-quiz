import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSession,
  onAuthStateChange,
  signIn,
  signOut,
  signUp,
} from '@/api/auth'
import { AuthApiError } from '@/api/auth-errors'
import App from '@/App'
import { id } from '@/i18n/id'
import { AuthProvider } from './AuthProvider'

vi.mock('@/api/auth', () => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}))

const mockedGetSession = vi.mocked(getSession)
const mockedOnAuthStateChange = vi.mocked(onAuthStateChange)
const mockedSignIn = vi.mocked(signIn)
const mockedSignOut = vi.mocked(signOut)
const mockedSignUp = vi.mocked(signUp)

const fakeUser = {
  id: 'user-1',
  email: 'guru@example.com',
  user_metadata: {},
} as unknown as User

const fakeSession = {
  access_token: 'test-token',
  user: fakeUser,
} as unknown as Session

function renderAuthApp(initialPath: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

async function waitForLoginForm() {
  return screen.findByRole('heading', { level: 1, name: id.auth.login.title })
}

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetSession.mockResolvedValue(null)
    mockedOnAuthStateChange.mockReturnValue({ unsubscribe: vi.fn() })
    mockedSignOut.mockResolvedValue(undefined)
  })

  it('mengalihkan halaman terproteksi ke login saat belum masuk', async () => {
    renderAuthApp('/dashboard')

    expect(await waitForLoginForm()).toBeInTheDocument()
  })

  it('menampilkan halaman terproteksi saat sudah masuk', async () => {
    mockedGetSession.mockResolvedValue(fakeSession)
    renderAuthApp('/dashboard')

    expect(await screen.findByRole('heading', { name: id.placeholders.dashboard.title })).toBeInTheDocument()
  })

  it('masuk lalu diarahkan ke dasbor', async () => {
    mockedSignIn.mockResolvedValue({ session: fakeSession, profileReady: true })
    const user = userEvent.setup()
    renderAuthApp('/login')

    await waitForLoginForm()
    await user.type(screen.getByLabelText(id.auth.login.email), 'guru@example.com')
    await user.type(screen.getByLabelText(id.auth.login.password), 'rahasia123')
    await user.click(screen.getByRole('button', { name: id.auth.login.submit }))

    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalledWith('guru@example.com', 'rahasia123')
    })
    expect(
      await screen.findByRole('heading', { name: id.placeholders.dashboard.title }),
    ).toBeInTheDocument()
  })

  it('menampilkan pesan saat kredensial salah', async () => {
    mockedSignIn.mockRejectedValue(new AuthApiError('invalid_credentials'))
    const user = userEvent.setup()
    renderAuthApp('/login')

    await waitForLoginForm()
    await user.type(screen.getByLabelText(id.auth.login.email), 'guru@example.com')
    await user.type(screen.getByLabelText(id.auth.login.password), 'salah')
    await user.click(screen.getByRole('button', { name: id.auth.login.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      id.auth.errors.invalid_credentials,
    )
    expect(screen.getByRole('heading', { level: 1, name: id.auth.login.title })).toBeInTheDocument()
  })

  it('menampilkan instruksi konfirmasi email setelah daftar tanpa sesi', async () => {
    mockedSignUp.mockResolvedValue({
      session: null,
      user: fakeUser,
      needsEmailConfirmation: true,
      profileReady: false,
    })
    const user = userEvent.setup()
    renderAuthApp('/signup')

    await screen.findByRole('heading', { level: 1, name: id.auth.signup.title })
    await user.type(screen.getByLabelText(id.auth.signup.email), 'baru@example.com')
    await user.type(screen.getByLabelText(id.auth.signup.password), 'rahasia123')
    await user.click(screen.getByRole('button', { name: id.auth.signup.submit }))

    await waitFor(() => {
      expect(mockedSignUp).toHaveBeenCalledWith({
        email: 'baru@example.com',
        password: 'rahasia123',
        displayName: undefined,
      })
    })
    expect(
      await screen.findByRole('heading', { level: 1, name: id.auth.confirmEmail.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('baru@example.com')).toBeInTheDocument()
  })

  it('keluar lalu kembali ke beranda', async () => {
    mockedGetSession.mockResolvedValue(fakeSession)
    const user = userEvent.setup()
    renderAuthApp('/dashboard')

    await screen.findByRole('heading', { name: id.placeholders.dashboard.title })
    await user.click(screen.getByRole('button', { name: id.nav.logout }))

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1)
    })
    expect(
      await screen.findByRole('heading', { level: 1, name: id.app.name }),
    ).toBeInTheDocument()
  })
})
