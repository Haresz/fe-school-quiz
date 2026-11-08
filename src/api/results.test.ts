import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { getQuizResults } from './results'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockedFrom = vi.mocked(supabase.from)

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
