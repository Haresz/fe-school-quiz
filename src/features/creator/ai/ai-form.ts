import { z } from 'zod'
import type { GenerateQuizInput } from '@/api/ai'
import { id } from '@/i18n/id'
import {
  DEFAULT_PER_QUESTION_SECONDS,
  DEFAULT_TOTAL_MINUTES,
  MAX_PER_QUESTION_SECONDS,
  MAX_TOTAL_SECONDS,
  MIN_PER_QUESTION_SECONDS,
  MIN_TOTAL_SECONDS,
} from '@/lib/quiz-settings'
import type { QuizSettings, QuizTimerSettings } from '@/types/database'

function isWholeNumberInRange(value: string, min: number, max: number): boolean {
  return /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max
}

export const aiFormSchema = z
  .object({
    materialId: z.string().trim().min(1, id.ai.validation.materialRequired),
    prompt: z.string().trim().max(500, id.ai.validation.promptMax),
    numQuestions: z
      .string()
      .trim()
      .min(1, id.ai.validation.countRequired)
      .refine(
        (value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 20,
        id.ai.validation.countRange,
      ),
    mix: z.enum(['mc_only', 'text_only', 'mixed']),
    difficulty: z.enum(['mudah', 'sedang', 'sulit']),
    revealAnswers: z.boolean(),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    timerMode: z.enum(['none', 'per_question', 'total']),
    perQuestionSeconds: z.string().trim(),
    totalMinutes: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (
      values.timerMode === 'per_question' &&
      !isWholeNumberInRange(
        values.perQuestionSeconds,
        MIN_PER_QUESTION_SECONDS,
        MAX_PER_QUESTION_SECONDS,
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['perQuestionSeconds'],
        message: id.ai.validation.timerPerQuestionRange,
      })
    }

    if (
      values.timerMode === 'total' &&
      !isWholeNumberInRange(
        values.totalMinutes,
        Math.ceil(MIN_TOTAL_SECONDS / 60),
        Math.floor(MAX_TOTAL_SECONDS / 60),
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['totalMinutes'],
        message: id.ai.validation.timerTotalRange,
      })
    }
  })

export type AiFormValues = z.infer<typeof aiFormSchema>

export function emptyAiFormValues(): AiFormValues {
  return {
    materialId: '',
    prompt: '',
    numQuestions: '5',
    mix: 'mixed',
    difficulty: 'sedang',
    revealAnswers: true,
    shuffleQuestions: true,
    shuffleOptions: true,
    timerMode: 'none',
    perQuestionSeconds: String(DEFAULT_PER_QUESTION_SECONDS),
    totalMinutes: String(DEFAULT_TOTAL_MINUTES),
  }
}

export function buildGenerateInput(values: AiFormValues): GenerateQuizInput {
  return {
    materialId: values.materialId,
    prompt: values.prompt.trim(),
    numQuestions: Number(values.numQuestions),
    mix: values.mix,
    difficulty: values.difficulty,
  }
}

export function buildAiDraftSettings(values: AiFormValues): QuizSettings {
  const timer: QuizTimerSettings =
    values.timerMode === 'per_question'
      ? { mode: 'per_question', seconds: Number(values.perQuestionSeconds) }
      : values.timerMode === 'total'
        ? { mode: 'total', seconds: Number(values.totalMinutes) * 60 }
        : { mode: 'none' }

  return {
    reveal_answers: values.revealAnswers,
    shuffle_questions: values.shuffleQuestions,
    shuffle_options: values.shuffleOptions,
    timer,
  }
}
