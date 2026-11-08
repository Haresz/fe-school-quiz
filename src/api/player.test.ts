import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { getQuizByCode, submitAttempt } from './player'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

const mockedRpc = vi.mocked(supabase.rpc)

describe('player API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('memuat kuis dari kode dan mengurutkan soal', async () => {
    mockedRpc.mockResolvedValueOnce({
      data: {
        quiz: {
          id: 'quiz-1',
          title: 'Pecahan kelas 5',
          description: 'Latihan dasar',
          status: 'published',
          settings: { reveal_answers: true },
        },
        questions: [
          {
            id: 'q2',
            position: 2,
            type: 'text',
            body: 'Ibu kota Indonesia?',
            points: 2,
          },
          {
            id: 'q1',
            position: 1,
            type: 'multiple_choice',
            body: '1/2 + 1/4 = ?',
            options: ['1/4', '3/4'],
            points: 1,
          },
        ],
      },
      error: null,
    } as never)

    const quiz = await getQuizByCode('ab12cd')

    expect(mockedRpc).toHaveBeenCalledWith('get_quiz_by_code', {
      p_code: 'AB12CD',
    })
    expect(quiz.revealAnswers).toBe(true)
    expect(quiz.questions.map((question) => question.id)).toEqual(['q1', 'q2'])
  })

  it('menolak kuis yang belum terbit', async () => {
    mockedRpc.mockResolvedValueOnce({
      data: {
        id: 'quiz-1',
        title: 'Pecahan kelas 5',
        status: 'draft',
        questions: [
          {
            id: 'q1',
            position: 1,
            type: 'text',
            body: 'Ibu kota Indonesia?',
            points: 1,
          },
        ],
      },
      error: null,
    } as never)

    await expect(getQuizByCode('ABCDEF')).rejects.toMatchObject({
      code: 'quiz_not_published',
    })
  })

  it('mengirim jawaban dan membaca hasil', async () => {
    mockedRpc.mockResolvedValueOnce({
      data: {
        attempt_id: 'attempt-1',
        score: 2,
        max_score: 3,
        answers: [
          {
            question_id: 'q1',
            is_correct: true,
            points_awarded: 2,
            correct_index: 1,
          },
          {
            question_id: 'q2',
            is_correct: false,
            points_awarded: 0,
            accepted_answers: ['Jakarta', 'DKI Jakarta'],
            explanation: 'Jakarta adalah ibu kota Indonesia.',
          },
        ],
      },
      error: null,
    } as never)

    const result = await submitAttempt({
      code: 'ab12cd',
      participantName: ' Rani ',
      answers: [
        { question_id: 'q1', answer: 1 },
        { question_id: 'q2', answer: 'Bandung' },
      ],
      fallbackMaxScore: 3,
    })

    expect(mockedRpc).toHaveBeenCalledWith('submit_attempt', {
      p_code: 'AB12CD',
      p_name: 'Rani',
      p_answers: [
        { question_id: 'q1', answer: 1 },
        { question_id: 'q2', answer: 'Bandung' },
      ],
    })
    expect(result).toMatchObject({
      attemptId: 'attempt-1',
      score: 2,
      maxScore: 3,
    })
    expect(result.reviews[1].correctAnswer).toBe('Jakarta, DKI Jakarta')
  })

  it('memetakan kode kuis yang tidak ditemukan', async () => {
    mockedRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'quiz_not_found' },
    } as never)

    await expect(getQuizByCode('ABCDEF')).rejects.toMatchObject({
      code: 'quiz_not_found',
    })
  })
})
