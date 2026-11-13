import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import {
  getAttemptDetail,
  getQuizResults,
  getQuizStats,
} from './results'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

const mockedFrom = vi.mocked(supabase.from)
const mockedRpc = vi.mocked(supabase.rpc)

const quizRow = {
  id: 'quiz-1',
  title: 'Pecahan kelas 5',
  status: 'published',
  share_code: 'AB12CD',
}

const attemptRows = [
  {
    id: 'attempt-2',
    participant_name: 'Rani',
    score: 4,
    max_score: 5,
    created_at: '2026-11-08T10:30:00.000Z',
  },
  {
    id: 'attempt-1',
    participant_name: 'Budi',
    score: 3,
    max_score: 5,
    created_at: '2026-11-07T09:00:00.000Z',
  },
]

function makeQuizBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  return builder
}

function makeAttemptsBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue(result),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  return builder
}

describe('getQuizResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('memuat kuis milik pembuat dan daftar pengerjaan terbaru', async () => {
    const quizBuilder = makeQuizBuilder({ data: quizRow, error: null })
    const attemptsBuilder = makeAttemptsBuilder({
      data: attemptRows,
      error: null,
    })
    mockedFrom
      .mockReturnValueOnce(quizBuilder as never)
      .mockReturnValueOnce(attemptsBuilder as never)

    const result = await getQuizResults('quiz-1', 'user-1')

    expect(mockedFrom).toHaveBeenNthCalledWith(1, 'quizzes')
    expect(mockedFrom).toHaveBeenNthCalledWith(2, 'attempts')
    expect(quizBuilder.select).toHaveBeenCalledWith(
      'id, title, status, share_code',
    )
    expect(quizBuilder.eq).toHaveBeenCalledWith('id', 'quiz-1')
    expect(quizBuilder.eq).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(attemptsBuilder.eq).toHaveBeenCalledWith('quiz_id', 'quiz-1')
    expect(attemptsBuilder.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
    expect(result).toEqual({
      quiz: {
        id: 'quiz-1',
        title: 'Pecahan kelas 5',
        status: 'published',
        shareCode: 'AB12CD',
      },
      attempts: [
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
      ],
    })
  })

  it('mengembalikan daftar kosong saat belum ada pengerjaan', async () => {
    mockedFrom
      .mockReturnValueOnce(makeQuizBuilder({ data: quizRow, error: null }) as never)
      .mockReturnValueOnce(
        makeAttemptsBuilder({ data: [], error: null }) as never,
      )

    await expect(getQuizResults('quiz-1', 'user-1')).resolves.toMatchObject({
      attempts: [],
    })
  })

  it('menolak kuis yang bukan milik pembuat', async () => {
    mockedFrom.mockReturnValueOnce(
      makeQuizBuilder({ data: null, error: null }) as never,
    )

    await expect(getQuizResults('quiz-1', 'user-2')).rejects.toMatchObject({
      code: 'quiz_not_found',
    })
    expect(mockedFrom).toHaveBeenCalledTimes(1)
  })

  it('memetakan kegagalan memuat pengerjaan', async () => {
    mockedFrom
      .mockReturnValueOnce(makeQuizBuilder({ data: quizRow, error: null }) as never)
      .mockReturnValueOnce(
        makeAttemptsBuilder({
          data: null,
          error: { message: 'permission denied' },
        }) as never,
      )

    await expect(getQuizResults('quiz-1', 'user-1')).rejects.toMatchObject({
      code: 'load_failed',
    })
  })
})

const attemptDetailRow = {
  items: [
    {
      question_id: 'q2',
      position: 2,
      type: 'text',
      body: 'Ibu kota Indonesia?',
      answer: 'Jakarta',
      answered: true,
      is_correct: false,
      points_awarded: 0,
      points: 1,
      correct_answer: 'Jakarta',
      accepted_answers: ['jakarta', 'dki jakarta'],
    },
    {
      question_id: 'q1',
      position: 1,
      type: 'multiple_choice',
      body: '1/2 + 1/4 = ?',
      options: ['1/4', '3/4', '1'],
      answer: 1,
      answered: true,
      is_correct: true,
      points_awarded: 1,
      points: 1,
      correct_index: 1,
      explanation: 'Samakan penyebutnya dulu.',
    },
  ],
  attempt: {
    id: 'attempt-1',
    quiz_id: 'quiz-1',
    participant_name: 'Rani',
    score: 2,
    max_score: 3,
    created_at: '2026-11-08T10:30:00.000Z',
  },
}

describe('getAttemptDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('memanggil RPC dan merapikan jawaban sesuai urutan soal', async () => {
    mockedRpc.mockResolvedValue({ data: attemptDetailRow, error: null } as never)

    const detail = await getAttemptDetail('attempt-1')

    expect(mockedRpc).toHaveBeenCalledWith('get_attempt_detail', {
      p_attempt_id: 'attempt-1',
    })
    expect(detail).toMatchObject({
      attemptId: 'attempt-1',
      quizId: 'quiz-1',
      quizTitle: '',
      participantName: 'Rani',
      score: 2,
      maxScore: 3,
    })
    expect(detail.answers.map((answer) => answer.questionId)).toEqual([
      'q1',
      'q2',
    ])
    expect(detail.answers[0]).toMatchObject({
      type: 'multiple_choice',
      answer: 1,
      isCorrect: true,
      pointsAwarded: 1,
      correctIndex: 1,
      explanation: 'Samakan penyebutnya dulu.',
    })
    expect(detail.answers[1]).toMatchObject({
      type: 'text',
      answer: 'Jakarta',
      isCorrect: false,
      correctAnswer: 'Jakarta',
    })
  })

  it('menerima bentuk camelCase yang dibungkus attempt', async () => {
    mockedRpc.mockResolvedValue({
      data: {
        attempt: {
          id: 'attempt-1',
          quizId: 'quiz-1',
          quizTitle: 'Pecahan kelas 5',
          participantName: 'Budi',
          score: 1,
          maxScore: 1,
          createdAt: '2026-11-09T08:00:00.000Z',
          reviews: [
            {
              questionId: 'q1',
              position: 1,
              type: 'multiple_choice',
              body: '1/2 + 1/4 = ?',
              options: ['1/4', '3/4', '1'],
              answer: { value: 1 },
              isCorrect: true,
              pointsAwarded: 1,
              correctIndex: 1,
            },
          ],
        },
      },
      error: null,
    } as never)

    const detail = await getAttemptDetail('attempt-1')

    expect(detail.participantName).toBe('Budi')
    expect(detail.answers).toHaveLength(1)
    expect(detail.answers[0].answer).toBe(1)
    expect(detail.answers[0].isCorrect).toBe(true)
  })

  it('menandai pengerjaan yang tidak ditemukan', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: null } as never)

    await expect(getAttemptDetail('attempt-x')).rejects.toMatchObject({
      code: 'attempt_not_found',
    })
  })

  it('memetakan kegagalan RPC', async () => {
    mockedRpc.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    } as never)

    await expect(getAttemptDetail('attempt-1')).rejects.toMatchObject({
      code: 'load_failed',
    })
  })
})

describe('getQuizStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merapikan statistik per soal dari objek jsonb', async () => {
    mockedRpc.mockResolvedValue({
      data: {
        attempt_count: 3,
        average_score: 2.3,
        max_score: 3,
        question_stats: [
          {
            question_id: 'q2',
            position: 2,
            body: 'Ibu kota Indonesia?',
            correct_count: 1,
            answered_count: 2,
          },
          {
            question_id: 'q1',
            position: 1,
            body: '1/2 + 1/4 = ?',
            correct_count: 2,
            answered_count: 2,
          },
        ],
      },
      error: null,
    } as never)

    const stats = await getQuizStats('quiz-1')

    expect(mockedRpc).toHaveBeenCalledWith('get_quiz_stats', {
      p_quiz_id: 'quiz-1',
    })
    expect(stats).toMatchObject({
      attemptCount: 3,
      averageScore: 2.3,
      maxScore: 3,
    })
    expect(stats.questionStats.map((stat) => stat.questionId)).toEqual([
      'q1',
      'q2',
    ])
    expect(stats.questionStats[0].correctRate).toBe(100)
    expect(stats.questionStats[1]).toMatchObject({
      correctCount: 1,
      answeredCount: 2,
      correctRate: 50,
    })
  })

  it('membaca statistik dari bentuk response total/correct/correct_pct', async () => {
    mockedRpc.mockResolvedValue({
      data: {
        quiz_id: 'quiz-1',
        questions: [
          {
            body: 'Test ya',
            type: 'text',
            total: 5,
            wrong: 4,
            points: 1,
            correct: 1,
            options: null,
            position: 1,
            wrong_pct: 80,
            unanswered: 0,
            correct_pct: 20,
            question_id: 'q1',
            unanswered_pct: 0,
          },
          {
            body: 'APA YANG PA',
            type: 'multiple_choice',
            total: 5,
            wrong: 0,
            points: 1,
            correct: 5,
            position: 2,
            wrong_pct: 0,
            unanswered: 0,
            correct_pct: 100,
            question_id: 'q2',
            unanswered_pct: 0,
          },
        ],
        avg_score_pct: 60,
        total_attempts: 5,
      },
      error: null,
    } as never)

    const stats = await getQuizStats('quiz-1')

    expect(stats.attemptCount).toBe(5)
    expect(stats.questionStats).toHaveLength(2)
    expect(stats.questionStats[0]).toMatchObject({
      questionId: 'q1',
      body: 'Test ya',
      correctCount: 1,
      answeredCount: 5,
      correctRate: 20,
    })
    expect(stats.questionStats[1]).toMatchObject({
      questionId: 'q2',
      correctCount: 5,
      answeredCount: 5,
      correctRate: 100,
    })
  })

  it('menerima daftar baris langsung dengan rate 0..1', async () => {
    mockedRpc.mockResolvedValue({
      data: [
        {
          questionId: 'q1',
          questionBody: '1/2 + 1/4 = ?',
          correctCount: 1,
          totalAnswers: 4,
          correctRate: 0.25,
        },
      ],
      error: null,
    } as never)

    const stats = await getQuizStats('quiz-1')

    expect(stats.questionStats[0]).toMatchObject({
      questionId: 'q1',
      body: '1/2 + 1/4 = ?',
      correctCount: 1,
      answeredCount: 4,
      correctRate: 25,
    })
  })

  it('memetakan kegagalan RPC statistik', async () => {
    mockedRpc.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    } as never)

    await expect(getQuizStats('quiz-1')).rejects.toMatchObject({
      code: 'load_failed',
    })
  })
})
