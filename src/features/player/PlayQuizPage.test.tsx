import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getQuizByCode,
  submitAttempt,
  type PlayerAttemptResult,
  type PlayerQuiz,
} from '@/api/player'
import { PlayerApiError } from '@/api/player-errors'
import { id } from '@/i18n/id'
import { PlayQuizPage } from './PlayQuizPage'
import { createQuizSession } from './quiz-session'

vi.mock('@/api/player', () => ({
  getQuizByCode: vi.fn(),
  submitAttempt: vi.fn(),
}))

vi.mock('./quiz-session', () => ({
  createQuizSession: vi.fn(),
}))

const mockedGetQuizByCode = vi.mocked(getQuizByCode)
const mockedSubmitAttempt = vi.mocked(submitAttempt)
const mockedCreateQuizSession = vi.mocked(createQuizSession)

const quiz: PlayerQuiz = {
  id: 'quiz-1',
  title: 'Pecahan kelas 5',
  description: 'Latihan dasar pecahan.',
  status: 'published',
  revealAnswers: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  timer: { mode: 'none' },
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

const perQuestionQuiz: PlayerQuiz = {
  ...quiz,
  timer: { mode: 'per_question', seconds: 30 },
}

const totalQuiz: PlayerQuiz = {
  ...quiz,
  timer: { mode: 'total', seconds: 60 },
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
    mockedCreateQuizSession.mockReturnValue({
      questionOrder: ['q1', 'q2'],
      optionOrders: { q1: [0, 1, 2], q2: [] },
    })
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

  it('memindahkan fokus ke judul soal saat mulai dan pindah soal', async () => {
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    expect(
      screen.getByRole('heading', { name: quiz.questions[0].body }),
    ).toHaveFocus()

    await user.click(screen.getByRole('radio', { name: 'B. 3/4' }))
    await user.click(screen.getByRole('button', { name: id.player.question.next }))

    expect(
      screen.getByRole('heading', { name: quiz.questions[1].body }),
    ).toHaveFocus()
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

  it('memakai indeks opsi asli saat opsi ditampilkan teracak', async () => {
    mockedCreateQuizSession.mockReturnValue({
      questionOrder: ['q1', 'q2'],
      optionOrders: { q1: [2, 1, 0], q2: [] },
    })
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    await user.click(screen.getByRole('radio', { name: 'C. 1/4' }))
    await user.click(screen.getByRole('button', { name: id.player.question.next }))
    await user.type(screen.getByLabelText(id.player.question.textLabel), 'Bandung')
    await user.click(
      screen.getByRole('button', { name: id.player.question.submit }),
    )

    await waitFor(() => {
      expect(mockedSubmitAttempt).toHaveBeenCalledWith({
        code: 'AB12CD',
        participantName: 'Rani',
        answers: [
          { question_id: 'q1', answer: 0 },
          { question_id: 'q2', answer: 'Bandung' },
        ],
        fallbackMaxScore: 3,
      })
    })

    expect(await screen.findByText('C. 1/4')).toBeInTheDocument()
  })

  it('membuat sesi baru saat mulai dan saat mengerjakan lagi', async () => {
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    expect(mockedCreateQuizSession).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('radio', { name: 'B. 3/4' }))
    await user.click(screen.getByRole('button', { name: id.player.question.next }))
    await user.type(screen.getByLabelText(id.player.question.textLabel), 'Bandung')
    await user.click(
      screen.getByRole('button', { name: id.player.question.submit }),
    )

    await screen.findByRole('heading', { name: id.player.result.stampGood })
    await user.click(screen.getByRole('button', { name: id.player.result.again }))

    expect(mockedCreateQuizSession).toHaveBeenCalledTimes(2)
    expect(
      screen.getByRole('heading', { name: quiz.questions[0].body }),
    ).toBeInTheDocument()
  })

  it('menampilkan layar tinjau dan mengirim dari sana', async () => {
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    await user.click(screen.getByRole('radio', { name: 'B. 3/4' }))
    await user.click(screen.getByRole('button', { name: id.player.question.next }))
    await user.type(screen.getByLabelText(id.player.question.textLabel), 'Bandung')
    await user.click(
      screen.getByRole('button', { name: id.player.question.review }),
    )

    expect(
      screen.getByRole('heading', { name: id.player.review.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('B. 3/4')).toBeInTheDocument()
    expect(screen.getByText('Bandung')).toBeInTheDocument()
    expect(screen.getAllByText(id.player.review.answered)).toHaveLength(2)

    await user.click(
      screen.getAllByRole('button', { name: id.player.review.edit })[1],
    )
    expect(
      screen.getByRole('heading', { name: quiz.questions[1].body }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: id.player.question.review }),
    )
    await user.click(
      screen.getByRole('button', { name: id.player.review.submit }),
    )

    await waitFor(() => {
      expect(mockedSubmitAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: [
            { question_id: 'q1', answer: 1 },
            { question_id: 'q2', answer: 'Bandung' },
          ],
        }),
      )
    })
  })

  it('menyembunyikan kembali dan tinjau pada mode per soal', async () => {
    mockedGetQuizByCode.mockResolvedValue(perQuestionQuiz)
    const user = userEvent.setup()
    renderPlayer()
    await startQuiz(user)

    expect(screen.getByText(/^Sisa waktu \d+:\d{2}$/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'B. 3/4' }))
    await user.click(screen.getByRole('button', { name: id.player.question.next }))

    expect(
      screen.queryByRole('button', { name: id.player.question.back }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: id.player.question.review }),
    ).not.toBeInTheDocument()
  })

  describe('timer', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: [
          'Date',
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
        ],
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function flushAsync() {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
    }

    async function startWithFakeTimers(target: PlayerQuiz) {
      mockedGetQuizByCode.mockResolvedValue(target)
      renderPlayer()
      await flushAsync()
      fireEvent.change(screen.getByLabelText(id.player.intro.nameLabel), {
        target: { value: 'Rani' },
      })
      fireEvent.click(screen.getByRole('button', { name: id.player.intro.start }))
    }

    it('melanjutkan otomatis saat waktu soal habis', async () => {
      await startWithFakeTimers(perQuestionQuiz)

      expect(
        screen.getByRole('heading', { name: quiz.questions[0].body }),
      ).toBeInTheDocument()
      expect(screen.getByText('Sisa waktu 0:30')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })

      expect(
        screen.getByRole('heading', { name: quiz.questions[1].body }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(id.player.timer.questionExpired),
      ).toBeInTheDocument()
      expect(screen.getByText('Sisa waktu 0:30')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })
      await flushAsync()

      expect(mockedSubmitAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: [
            { question_id: 'q1', answer: null },
            { question_id: 'q2', answer: null },
          ],
        }),
      )
    })

    it('mengirim otomatis saat waktu total habis dengan jawaban yang ada', async () => {
      await startWithFakeTimers(totalQuiz)

      fireEvent.click(screen.getByRole('radio', { name: 'B. 3/4' }))
      fireEvent.click(
        screen.getByRole('button', { name: id.player.question.next }),
      )
      expect(
        screen.getByRole('heading', { name: quiz.questions[1].body }),
      ).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000)
      })
      await flushAsync()

      expect(mockedSubmitAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: [
            { question_id: 'q1', answer: 1 },
            { question_id: 'q2', answer: null },
          ],
        }),
      )
    })

    it('mencegah pengiriman ganda', async () => {
      mockedSubmitAttempt.mockReturnValue(new Promise(() => {}) as never)
      await startWithFakeTimers(quiz)

      fireEvent.click(screen.getByRole('radio', { name: 'B. 3/4' }))
      fireEvent.click(
        screen.getByRole('button', { name: id.player.question.next }),
      )
      fireEvent.change(screen.getByLabelText(id.player.question.textLabel), {
        target: { value: 'Bandung' },
      })

      const submit = screen.getByRole('button', {
        name: id.player.question.submit,
      })
      fireEvent.click(submit)
      fireEvent.click(submit)

      expect(mockedSubmitAttempt).toHaveBeenCalledTimes(1)
    })

    it('menghentikan timer saat pengiriman gagal lalu melanjutkan sisa waktu', async () => {
      mockedSubmitAttempt.mockRejectedValueOnce(new PlayerApiError('network'))
      await startWithFakeTimers(totalQuiz)

      fireEvent.click(screen.getByRole('radio', { name: 'B. 3/4' }))
      fireEvent.click(
        screen.getByRole('button', { name: id.player.question.next }),
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })
      const remainingBeforeSubmit = screen.getByText(/^Sisa waktu \d+:\d{2}$/)
        .textContent
      expect(remainingBeforeSubmit).toBe('Sisa waktu 0:50')

      fireEvent.change(screen.getByLabelText(id.player.question.textLabel), {
        target: { value: 'Bandung' },
      })
      fireEvent.click(
        screen.getByRole('button', { name: id.player.question.submit }),
      )
      await flushAsync()

      expect(
        screen.getByText(id.player.question.submitErrorTitle),
      ).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })
      expect(
        screen.getByText(/^Sisa waktu \d+:\d{2}$/).textContent,
      ).toBe(remainingBeforeSubmit)

      fireEvent.click(
        screen.getByRole('button', { name: id.player.question.retry }),
      )
      await flushAsync()

      expect(mockedSubmitAttempt).toHaveBeenCalledTimes(2)
      expect(
        screen.getByRole('heading', { name: id.player.result.stampGood }),
      ).toBeInTheDocument()
    })
  })
})
