import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteQuiz, listCreatorQuizzes, type CreatorQuizSummary } from '@/api/quizzes'
import { QuizApiError } from '@/api/quiz-errors'
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/auth-context'
import { id } from '@/i18n/id'
import { DashboardPage } from './DashboardPage'

vi.mock('@/api/quizzes', () => ({
  listCreatorQuizzes: vi.fn(),
  deleteQuiz: vi.fn(),
  getQuizForEdit: vi.fn(),
  saveQuiz: vi.fn(),
}))

const mockedListCreatorQuizzes = vi.mocked(listCreatorQuizzes)
const mockedDeleteQuiz = vi.mocked(deleteQuiz)

const fakeUser = {
  id: 'user-1',
  email: 'guru@example.com',
  user_metadata: {},
} as unknown as User

const authValue: AuthContextValue = {
  session: { access_token: 'test-token', user: fakeUser } as unknown as Session,
  user: fakeUser,
  status: 'authenticated',
  signIn: async () => {
    throw new Error('tidak dipakai')
  },
  signUp: async () => {
    throw new Error('tidak dipakai')
  },
  signOut: async () => undefined,
}

const draftQuiz: CreatorQuizSummary = {
  id: 'quiz-1',
  title: 'Pecahan kelas 5',
  description: 'Latihan dasar penjumlahan pecahan.',
  status: 'draft',
  source: 'manual',
  share_code: 'AB12CD',
  created_at: '2026-11-01T08:00:00.000Z',
  updated_at: '2026-11-08T08:00:00.000Z',
}

const publishedQuiz: CreatorQuizSummary = {
  id: 'quiz-2',
  title: 'Tata Surya',
  description: null,
  status: 'published',
  source: 'ai',
  share_code: 'ZX34YZ',
  created_at: '2026-11-02T08:00:00.000Z',
  updated_at: '2026-11-07T08:00:00.000Z',
}

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListCreatorQuizzes.mockResolvedValue([draftQuiz, publishedQuiz])
    mockedDeleteQuiz.mockResolvedValue(undefined)
  })

  it('menampilkan daftar kuis beserta status dan kode', async () => {
    renderDashboard()

    expect(
      screen.getByRole('link', { name: id.dashboard.createWithAi }),
    ).toHaveAttribute('href', '/quizzes/ai')

    const draftArticle = await screen.findByRole('article', {
      name: draftQuiz.title,
    })
    expect(within(draftArticle).getByText(id.status.draft)).toBeInTheDocument()
    expect(within(draftArticle).getByText(draftQuiz.share_code)).toBeInTheDocument()
    expect(within(draftArticle).getByText(id.dashboard.draftShareHint)).toBeInTheDocument()

    const publishedArticle = screen.getByRole('article', {
      name: publishedQuiz.title,
    })
    expect(within(publishedArticle).getByText(id.status.published)).toBeInTheDocument()
    expect(within(publishedArticle).getByText(id.status.ai)).toBeInTheDocument()
    expect(
      within(publishedArticle).getByRole('link', { name: /buka kuis/i }),
    ).toBeInTheDocument()
  })

  it('menampilkan ajakan membuat kuis saat dasbor kosong', async () => {
    mockedListCreatorQuizzes.mockResolvedValue([])
    renderDashboard()

    expect(
      await screen.findByRole('heading', { name: id.dashboard.emptyTitle }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: id.dashboard.create }),
    ).toHaveLength(2)
  })

  it('menyaring kuis berdasarkan status', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await screen.findByRole('article', { name: draftQuiz.title })
    await user.click(screen.getByRole('button', { name: 'Draf 1' }))

    expect(screen.getByRole('article', { name: draftQuiz.title })).toBeInTheDocument()
    expect(
      screen.queryByRole('article', { name: publishedQuiz.title }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Terbit 1' }))
    expect(
      screen.getByRole('article', { name: publishedQuiz.title }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('article', { name: draftQuiz.title }),
    ).not.toBeInTheDocument()
  })

  it('menampilkan empty state saat filter status tidak punya kuis', async () => {
    mockedListCreatorQuizzes.mockResolvedValue([publishedQuiz])
    const user = userEvent.setup()
    renderDashboard()

    await screen.findByRole('article', { name: publishedQuiz.title })
    await user.click(screen.getByRole('button', { name: 'Draf 0' }))

    expect(
      screen.getByRole('heading', { name: id.dashboard.emptyDraftTitle }),
    ).toBeInTheDocument()
  })

  it('menghapus kuis setelah konfirmasi', async () => {
    mockedListCreatorQuizzes
      .mockResolvedValueOnce([draftQuiz])
      .mockResolvedValueOnce([])
    const user = userEvent.setup()
    renderDashboard()

    await screen.findByRole('article', { name: draftQuiz.title })
    await user.click(
      screen.getByRole('button', { name: `${id.dashboard.delete}: ${draftQuiz.title}` }),
    )

    expect(
      screen.getByRole('alertdialog', { name: id.dashboard.deleteConfirmTitle }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: id.dashboard.deleteConfirm }),
    )

    await waitFor(() => {
      expect(mockedDeleteQuiz).toHaveBeenCalledWith(draftQuiz.id, fakeUser.id)
    })
    expect(
      await screen.findByText(id.dashboard.deleted),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('article', { name: draftQuiz.title }),
    ).not.toBeInTheDocument()
  })

  it('menampilkan pesan saat kuis gagal dihapus', async () => {
    mockedDeleteQuiz.mockRejectedValue(new QuizApiError('delete_failed'))
    const user = userEvent.setup()
    renderDashboard()

    await screen.findByRole('article', { name: draftQuiz.title })
    await user.click(
      screen.getByRole('button', { name: `${id.dashboard.delete}: ${draftQuiz.title}` }),
    )
    await user.click(
      screen.getByRole('button', { name: id.dashboard.deleteConfirm }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      id.editor.errors.delete_failed,
    )
  })

  it('menampilkan error saat dasbor gagal dimuat', async () => {
    mockedListCreatorQuizzes.mockRejectedValue(new QuizApiError('load_failed'))
    renderDashboard()

    expect(
      await screen.findByRole('heading', { name: id.dashboard.loadErrorTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(id.editor.errors.load_failed)).toBeInTheDocument()
  })
})
