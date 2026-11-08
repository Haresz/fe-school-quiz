import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizApiError } from '@/api/quiz-errors'
import {
  getQuizResults,
  type QuizAttemptSummary,
  type QuizResults,
} from '@/api/results'
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/auth-context'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'
import { QuizResultsPage } from './QuizResultsPage'

vi.mock('@/api/results', () => ({
  getQuizResults: vi.fn(),
}))

const mockedGetQuizResults = vi.mocked(getQuizResults)

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

const attempts: QuizAttemptSummary[] = [
  {
    id: 'attempt-2',
    participantName: 'Rani',
    score: 4,
    maxScore: 5,
    createdAt: '2026-11-08T10:30:00.000Z',
  },
  {
    id: 'attempt-1',
    participantName: 'Budi',
    score: 3,
    maxScore: 5,
    createdAt: '2026-11-07T09:00:00.000Z',
  },
]

const results: QuizResults = {
  quiz: {
    id: 'quiz-1',
    title: 'Pecahan kelas 5',
    status: 'published',
    shareCode: 'AB12CD',
  },
  attempts,
}

function renderResults() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/quizzes/quiz-1/results']}>
          <Routes>
            <Route
              path="/quizzes/:id/results"
              element={<QuizResultsPage />}
            />
            <Route path="/dashboard" element={<p>Dasbor</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('QuizResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetQuizResults.mockResolvedValue(results)
  })

  it('menampilkan ringkasan dan daftar pengerjaan', async () => {
    renderResults()

    expect(await screen.findByText(results.quiz.title)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: id.results.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(results.quiz.shareCode)).toBeInTheDocument()

    const summary = screen.getByLabelText(id.results.summaryLabel)
    expect(within(summary).getByText('2')).toBeInTheDocument()
    expect(within(summary).getByText('70%')).toBeInTheDocument()
    expect(within(summary).getByText('80%')).toBeInTheDocument()

    const rani = screen.getByRole('article', { name: 'Rani' })
    expect(within(rani).getByText('4 / 5')).toBeInTheDocument()
    expect(within(rani).getByText('80%')).toBeInTheDocument()

    const budi = screen.getByRole('article', { name: 'Budi' })
    expect(within(budi).getByText('3 / 5')).toBeInTheDocument()
    expect(within(budi).getByText('60%')).toBeInTheDocument()

    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('mengarahkan pembuat membagikan kode saat belum ada pengerjaan', async () => {
    mockedGetQuizResults.mockResolvedValue({
      ...results,
      attempts: [],
    })
    renderResults()

    expect(
      await screen.findByRole('heading', {
        name: id.results.emptyPublishedTitle,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        formatMessage(id.results.emptyPublishedBody, {
          code: results.quiz.shareCode,
        }),
      ),
    ).toBeInTheDocument()
  })

  it('mengarahkan ke edit saat kuis masih draf', async () => {
    mockedGetQuizResults.mockResolvedValue({
      quiz: { ...results.quiz, status: 'draft' },
      attempts: [],
    })
    renderResults()

    expect(
      await screen.findByRole('heading', {
        name: id.results.emptyDraftTitle,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: id.results.editQuiz }),
    ).toHaveAttribute('href', '/quizzes/quiz-1/edit')
  })

  it('menampilkan pesan saat kuis tidak ditemukan', async () => {
    mockedGetQuizResults.mockRejectedValue(new QuizApiError('quiz_not_found'))
    renderResults()

    expect(
      await screen.findByRole('heading', {
        name: id.results.notFoundTitle,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: id.results.notFoundAction }),
    ).toHaveAttribute('href', '/dashboard')
  })

  it('bisa mencoba lagi saat hasil gagal dimuat', async () => {
    mockedGetQuizResults
      .mockRejectedValueOnce(new QuizApiError('load_failed'))
      .mockResolvedValueOnce({ ...results, attempts: [] })
    const user = userEvent.setup()
    renderResults()

    expect(
      await screen.findByRole('heading', {
        name: id.results.loadErrorTitle,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(id.results.errors.load_failed),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: id.common.retry }))

    expect(
      await screen.findByRole('heading', {
        name: id.results.emptyPublishedTitle,
      }),
    ).toBeInTheDocument()
  })
})
