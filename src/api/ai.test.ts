import { describe, expect, it, vi } from 'vitest'
import { AiApiError, generateQuizWithAi, type GenerateQuizInput } from './ai'

const input: GenerateQuizInput = {
  materialId: 'material-1',
  prompt: 'Fokus pada soal cerita.',
  numQuestions: 5,
  mix: 'mixed',
  difficulty: 'sedang',
}

const draft = {
  material_id: 'material-1',
  title: 'Pecahan kelas 5',
  description: null,
  source: 'ai',
  status: 'draft',
  settings: { reveal_answers: true },
  questions: [
    {
      type: 'multiple_choice',
      body: '1/2 + 1/4 = ?',
      options: ['1/4', '3/4'],
      correct_index: 1,
      explanation: 'Samakan penyebut terlebih dulu.',
      points: 1,
    },
    {
      type: 'text',
      body: 'Hasil 3/4 - 1/4?',
      accepted_answers: ['1/2', '0,5'],
      explanation: null,
      points: 1,
    },
  ],
}

function makeFetch(result: {
  ok: boolean
  status: number
  body: unknown
  reject?: boolean
}) {
  if (result.reject) return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  return vi.fn().mockResolvedValue({
    ok: result.ok,
    status: result.status,
    json: vi.fn().mockResolvedValue(result.body),
  })
}

describe('generateQuizWithAi', () => {
  it('mengirim kontrak backend dan memetakan draf AI', async () => {
    const fetchMock = makeFetch({
      ok: true,
      status: 200,
      body: { generation_id: 'generation-1', draft },
    })

    const result = await generateQuizWithAi(input, 'token-1', fetchMock as never)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/ai/generate-quiz',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-1',
        },
        body: JSON.stringify({
          material_id: 'material-1',
          prompt: 'Fokus pada soal cerita.',
          num_questions: 5,
          mix: 'mixed',
          difficulty: 'sedang',
        }),
      },
    )
    expect(result).toEqual({
      generationId: 'generation-1',
      draft,
    })
  })

  it('memakai kode error dari backend', async () => {
    const fetchMock = makeFetch({
      ok: false,
      status: 429,
      body: { error: { code: 'rate_limited', message: 'terlalu sering' } },
    })

    await expect(
      generateQuizWithAi(input, 'token-1', fetchMock as never),
    ).rejects.toMatchObject({ code: 'rate_limited' })
  })

  it('memakai status HTTP saat kode error tidak tersedia', async () => {
    const fetchMock = makeFetch({
      ok: false,
      status: 503,
      body: null,
    })

    await expect(
      generateQuizWithAi(input, 'token-1', fetchMock as never),
    ).rejects.toMatchObject({ code: 'ai_quota_exceeded' })
  })

  it('menolak draf AI dengan bentuk yang tidak sesuai', async () => {
    const fetchMock = makeFetch({
      ok: true,
      status: 200,
      body: { generation_id: 'generation-1', draft: { title: '' } },
    })

    await expect(
      generateQuizWithAi(input, 'token-1', fetchMock as never),
    ).rejects.toEqual(expect.objectContaining({ code: 'ai_bad_output' }))
  })

  it('memetakan kegagalan jaringan', async () => {
    const fetchMock = makeFetch({
      ok: false,
      status: 500,
      body: null,
      reject: true,
    })

    await expect(
      generateQuizWithAi(input, 'token-1', fetchMock as never),
    ).rejects.toBeInstanceOf(AiApiError)
    await expect(
      generateQuizWithAi(input, 'token-1', fetchMock as never),
    ).rejects.toMatchObject({ code: 'network' })
  })
})
