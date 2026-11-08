import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getQuizByCode,
  submitAttempt,
  type PlayerAttemptResult,
  type PlayerQuiz,
} from '@/api/player'
import { PlayerApiError } from '@/api/player-errors'
import { id } from '@/i18n/id'
import { PlayQuizPage } from './PlayQuizPage'

vi.mock('@/api/player', () => ({
  getQuizByCode: vi.fn(),
  submitAttempt: vi.fn(),
}))

const mockedGetQuizByCode = vi.mocked(getQuizByCode)
const mockedSubmitAttempt = vi.mocked(submitAttempt)

const quiz: PlayerQuiz = {
  id: 'quiz-1',
  title: 'Pecahan kelas 5',
  description: 'Latihan dasar pecahan.',
  status: 'published',
  revealAnswers: true,
  questions: [
    {
      id: 'q1',
      position: 1,
      type: 'multiple_choice',
      body: '1/2 + 1/4 = ?',
      options: ['1/4', '3/4', '1'],
      points: 1,
    },
    {
      id: 'q2',
      position: 2,
      type: 'text',
      body: 'Ibu kota Indonesia?',
      options: null,
      points: 2,
    },
  ],
}

const attemptResult: PlayerAttemptResult = {
  attemptId: 'attempt-1',
  score: 2,
  maxScore: 3,
  reviews: [
    {
      questionId: 'q1',
      isCorrect: true,
      pointsAwarded: 1,
      correctAnswer: null,
      correctIndex: 1,
      explanation: 'Samakan penyebutnya dulu.',
    },
    {
      questionId: 'q2',
      isCorrect: false,
      pointsAwarded: 0,
      correctAnswer: 'Jakarta',
      correctIndex: null,
      explanation: 'Jakarta adalah ibu kota Indonesia.',
    },
  ],
}

function renderPlayer() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/play/AB12CD']}>
        <Routes>
          <Route path="/play/:code" element={<PlayQuizPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { level: 1, name: quiz.title })
  await user.type(screen.getByLabelText(id.player.intro.nameLabel), 'Rani')
  await user.click(screen.getByRole('button', { name: id.player.intro.start }))
}

describe('PlayQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetQuizByCode.mockResolvedValue(quiz)
    mockedSubmitAttempt.mockResolvedValue(attemptResult)
  })

  it('mengantar murid menjawab sampai melihat hasil', async () => {
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    expect(
      screen.getByRole('heading', { name: quiz.questions[0].body }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Soal 1 dari 2'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'B. 3/4' }))
    await user.click(screen.getByRole('button', { name: id.player.question.next }))

    expect(
      screen.getByRole('heading', { name: quiz.questions[1].body }),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText(id.player.question.textLabel), 'Bandung')
    await user.click(
      screen.getByRole('button', { name: id.player.question.submit }),
    )

    await waitFor(() => {
      expect(mockedSubmitAttempt).toHaveBeenCalledWith({
        code: 'AB12CD',
        participantName: 'Rani',
        answers: [
          { question_id: 'q1', answer: 1 },
          { question_id: 'q2', answer: 'Bandung' },
        ],
        fallbackMaxScore: 3,
      })
    })

    expect(
      await screen.findByRole('heading', { name: id.player.result.stampGood }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 dari 3 poin')).toBeInTheDocument()
    expect(screen.getByText(id.player.result.correct)).toBeInTheDocument()
    expect(screen.getByText(id.player.result.incorrect)).toBeInTheDocument()
    expect(screen.getByText(id.player.result.correctAnswer)).toBeInTheDocument()
    expect(screen.getByText('Jakarta')).toBeInTheDocument()
    expect(
      screen.getAllByText(id.player.result.explanation),
    ).toHaveLength(2)
  })

  it('meminta jawaban sebelum lanjut ke soal berikutnya', async () => {
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    await user.click(screen.getByRole('button', { name: id.player.question.next }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      id.player.question.chooseRequired,
    )
    expect(
      screen.getByRole('heading', { name: quiz.questions[0].body }),
    ).toBeInTheDocument()
  })

  it('menampilkan pesan saat kode kuis tidak ditemukan', async () => {
    mockedGetQuizByCode.mockRejectedValue(new PlayerApiError('quiz_not_found'))
    renderPlayer()

    expect(
      await screen.findByRole('heading', { name: id.player.notFoundTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText(id.player.notFoundBody)).toBeInTheDocument()
  })

  it('menjaga jawaban saat pengiriman terputus', async () => {
    mockedSubmitAttempt.mockRejectedValue(new PlayerApiError('network'))
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    await user.click(screen.getByRole('radio', { name: 'B. 3/4' }))
    await user.click(screen.getByRole('button', { name: id.player.question.next }))
    await user.type(screen.getByLabelText(id.player.question.textLabel), 'Bandung')
    await user.click(
      screen.getByRole('button', { name: id.player.question.submit }),
    )

    expect(
      await screen.findByText(id.player.question.submitErrorTitle),
    ).toBeInTheDocument()
    expect(screen.getByText(id.player.errors.network)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: quiz.questions[1].body }),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bandung')).toBeInTheDocument()
  })
})
