import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizApiError } from '@/api/quiz-errors'
import {
  getAttemptDetail,
  type QuizAttemptDetail,
} from '@/api/results'
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/auth-context'
import { id } from '@/i18n/id'
import { QuizAttemptDetailPage } from './QuizAttemptDetailPage'

vi.mock('@/api/results', () => ({
  getAttemptDetail: vi.fn(),
}))

const mockedGetAttemptDetail = vi.mocked(getAttemptDetail)

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

const detail: QuizAttemptDetail = {
  attemptId: 'attempt-1',
  quizId: 'quiz-1',
  quizTitle: 'Pecahan kelas 5',
  participantName: 'Rani',
  score: 1,
  maxScore: 2,
  createdAt: '2026-11-08T10:30:00.000Z',
  answers: [
    {
      questionId: 'q1',
      position: 1,
      body: '1/2 + 1/4 = ?',
      type: 'multiple_choice',
      options: ['1/4', '3/4', '1'],
      answer: 1,
      isCorrect: true,
      pointsAwarded: 1,
      points: 1,
      correctIndex: 1,
      correctAnswer: null,
      explanation: 'Samakan penyebutnya dulu.',
    },
    {
      questionId: 'q2',
      position: 2,
      body: 'Ibu kota Indonesia?',
      type: 'text',
      options: null,
      answer: 'Bandung',
      isCorrect: false,
      pointsAwarded: 0,
      points: 1,
      correctIndex: null,
      correctAnswer: 'Jakarta',
      explanation: null,
    },
  ],
}

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter
          initialEntries={['/quizzes/quiz-1/results/attempt-1']}
        >
          <Routes>
            <Route
              path="/quizzes/:id/results/:attemptId"
              element={<QuizAttemptDetailPage />}
            />
            <Route
              path="/quizzes/:id/results"
              element={<p>Hasil kuis</p>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('QuizAttemptDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetAttemptDetail.mockResolvedValue(detail)
  })

  it('menampilkan rincian jawaban murid per soal', async () => {
    renderDetail()

    expect(await screen.findByText('Rani')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: id.results.detail.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('Pecahan kelas 5')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()

    const firstAnswer = screen.getByRole('article', {
      name: /1\/2 \+ 1\/4 = \?/,
    })
    expect(within(firstAnswer).getAllByText('B. 3/4')).toHaveLength(2)
    expect(
      within(firstAnswer).getByText(id.results.detail.correct),
    ).toBeInTheDocument()
    expect(
      within(firstAnswer).getByText('Samakan penyebutnya dulu.'),
    ).toBeInTheDocument()

    const secondAnswer = screen.getByRole('article', {
      name: /Ibu kota Indonesia\?/,
    })
    expect(within(secondAnswer).getByText('Bandung')).toBeInTheDocument()
    expect(within(secondAnswer).getByText('Jakarta')).toBeInTheDocument()
    expect(
      within(secondAnswer).getByText(id.results.detail.incorrect),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: id.results.detail.back }),
    ).toHaveAttribute('href', '/quizzes/quiz-1/results')
  })

  it('menampilkan pesan saat pengerjaan tidak ditemukan', async () => {
    mockedGetAttemptDetail.mockRejectedValue(
      new QuizApiError('attempt_not_found'),
    )
    renderDetail()

    expect(
      await screen.findByRole('heading', {
        name: id.results.detail.notFoundTitle,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(id.results.detail.notFoundBody)).toBeInTheDocument()
  })

  it('menampilkan keadaan kosong saat tidak ada jawaban tersimpan', async () => {
    mockedGetAttemptDetail.mockResolvedValue({ ...detail, answers: [] })
    renderDetail()

    expect(
      await screen.findByRole('heading', {
        name: id.results.detail.emptyTitle,
      }),
    ).toBeInTheDocument()
  })

  it('bisa mencoba lagi saat rincian gagal dimuat', async () => {
    mockedGetAttemptDetail
      .mockRejectedValueOnce(new QuizApiError('load_failed'))
      .mockResolvedValueOnce(detail)
    const user = userEvent.setup()
    renderDetail()

    expect(
      await screen.findByRole('heading', {
        name: id.results.detail.loadErrorTitle,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(id.results.errors.load_failed)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: id.common.retry }))

    expect(
      await screen.findByRole('heading', { name: id.results.detail.title }),
    ).toBeInTheDocument()
  })
})
