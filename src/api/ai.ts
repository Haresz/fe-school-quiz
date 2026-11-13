import { z } from 'zod'
import { env } from '@/lib/env'

export type AiQuestionMix = 'mc_only' | 'text_only' | 'mixed'
export type AiDifficulty = 'mudah' | 'sedang' | 'sulit'

export type GenerateQuizInput = {
  materialId: string
  prompt: string
  numQuestions: number
  mix: AiQuestionMix
  difficulty: AiDifficulty
}

const multipleChoiceDraftSchema = z
  .object({
    type: z.literal('multiple_choice'),
    body: z.string().trim().min(1),
    options: z.array(z.string().trim()).min(2).max(6),
    correct_index: z.number().int().min(0),
    explanation: z.string().nullable(),
    points: z.number().int().positive(),
  })
  .superRefine((question, ctx) => {
    if (question.correct_index >= question.options.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['correct_index'],
        message: 'correct_index di luar rentang opsi',
      })
    }
  })

const textDraftSchema = z.object({
  type: z.literal('text'),
  body: z.string().trim().min(1),
  accepted_answers: z.array(z.string().trim()).min(1),
  explanation: z.string().nullable(),
  points: z.number().int().positive(),
})

export const aiDraftQuestionSchema = z.discriminatedUnion('type', [
  multipleChoiceDraftSchema,
  textDraftSchema,
])

const aiTimerSchema = z.object({
  mode: z.enum(['none', 'per_question', 'total']),
  seconds: z.number().int().positive().optional(),
})

export const aiQuizDraftSchema = z.object({
  material_id: z.string().nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().nullable(),
  source: z.literal('ai'),
  status: z.literal('draft'),
  settings: z
    .object({
      reveal_answers: z.boolean().optional(),
      shuffle_questions: z.boolean().optional(),
      shuffle_options: z.boolean().optional(),
      timer: aiTimerSchema.optional(),
    })
    .passthrough()
    .optional(),
  questions: z.array(aiDraftQuestionSchema).min(1).max(20),
})

export type AiDraftQuestion = z.infer<typeof aiDraftQuestionSchema>
export type AiQuizDraft = z.infer<typeof aiQuizDraftSchema>

export type GenerateQuizResult = {
  generationId: string
  draft: AiQuizDraft
}

const responseSchema = z.object({
  generation_id: z.string().min(1),
  draft: aiQuizDraftSchema,
})

export type AiErrorCode =
  | 'unauthorized'
  | 'invalid_request'
  | 'material_not_found'
  | 'rate_limited'
  | 'ai_capacity_reached'
  | 'ai_bad_output'
  | 'ai_blocked'
  | 'ai_timeout'
  | 'ai_quota_exceeded'
  | 'ai_unavailable'
  | 'internal_error'
  | 'network'
  | 'unknown'

export class AiApiError extends Error {
  code: AiErrorCode

  constructor(code: AiErrorCode) {
    super(code)
    this.name = 'AiApiError'
    this.code = code
  }
}

const ERROR_CODES: AiErrorCode[] = [
  'unauthorized',
  'invalid_request',
  'material_not_found',
  'rate_limited',
  'ai_capacity_reached',
  'ai_bad_output',
  'ai_blocked',
  'ai_timeout',
  'ai_quota_exceeded',
  'ai_unavailable',
  'internal_error',
  'network',
  'unknown',
]

function isAiErrorCode(value: string): value is AiErrorCode {
  return ERROR_CODES.includes(value as AiErrorCode)
}

function readErrorCode(data: unknown): AiErrorCode | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const error = (data as { error?: unknown }).error
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && isAiErrorCode(code) ? code : undefined
}

function errorCodeForStatus(status: number): AiErrorCode {
  switch (status) {
    case 400:
      return 'invalid_request'
    case 401:
      return 'unauthorized'
    case 403:
      return 'ai_blocked'
    case 404:
      return 'material_not_found'
    case 408:
    case 504:
      return 'ai_timeout'
    case 422:
      return 'ai_blocked'
    case 429:
      return 'rate_limited'
    case 502:
      return 'ai_bad_output'
    case 503:
      return 'ai_quota_exceeded'
    default:
      return 'unknown'
  }
}

export async function generateQuizWithAi(
  input: GenerateQuizInput,
  accessToken: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<GenerateQuizResult> {
  try {
    const response = await fetchImpl(`${env.VITE_API_BASE_URL}/ai/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        material_id: input.materialId,
        prompt: input.prompt,
        num_questions: input.numQuestions,
        mix: input.mix,
        difficulty: input.difficulty,
      }),
    })

    const data: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      throw new AiApiError(
        readErrorCode(data) ?? errorCodeForStatus(response.status),
      )
    }

    const parsed = responseSchema.safeParse(data)
    if (!parsed.success) throw new AiApiError('ai_bad_output')

    return {
      generationId: parsed.data.generation_id,
      draft: parsed.data.draft,
    }
  } catch (error) {
    if (error instanceof AiApiError) throw error
    throw new AiApiError('network')
  }
}
