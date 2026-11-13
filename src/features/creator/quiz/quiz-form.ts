import { z } from 'zod'
import type { QuizEditorData, QuizSavePayload } from '@/api/quizzes'
import { id } from '@/i18n/id'
import {
  DEFAULT_PER_QUESTION_SECONDS,
  DEFAULT_TOTAL_MINUTES,
  MAX_PER_QUESTION_SECONDS,
  MAX_TOTAL_SECONDS,
  MIN_PER_QUESTION_SECONDS,
  MIN_TOTAL_SECONDS,
} from '@/lib/quiz-settings'
import type {
  QuestionType,
  QuizSettings,
  QuizSource,
  QuizTimerSettings,
} from '@/types/database'

const optionSchema = z.object({
  key: z.string(),
  text: z.string().trim(),
})

const acceptedAnswerSchema = z.object({
  key: z.string(),
  text: z.string().trim(),
})

const questionSchema = z
  .object({
    key: z.string(),
    type: z.enum(['multiple_choice', 'text']),
    body: z.string().trim().min(1, id.editor.validation.bodyRequired),
    points: z
      .string()
      .trim()
      .min(1, id.editor.validation.pointsRequired)
      .refine(
        (value) => /^\d+$/.test(value) && Number(value) >= 1,
        id.editor.validation.pointsRequired,
      ),
    explanation: z.string(),
    options: z.array(optionSchema).max(6, id.editor.validation.optionsMax),
    correctOptionKey: z.string(),
    acceptedAnswers: z.array(acceptedAnswerSchema),
  })
  .superRefine((question, ctx) => {
    if (question.type === 'multiple_choice') {
      if (question.options.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: id.editor.validation.optionsMin,
        })
      }

      if (!question.correctOptionKey) {
        ctx.addIssue({
          code: 'custom',
          path: ['correctOptionKey'],
          message: id.editor.validation.correctRequired,
        })
      } else if (!question.options.some((option) => option.key === question.correctOptionKey)) {
        ctx.addIssue({
          code: 'custom',
          path: ['correctOptionKey'],
          message: id.editor.validation.correctRequired,
        })
      }

      question.options.forEach((option, optionIndex) => {
        if (!option.text) {
          ctx.addIssue({
            code: 'custom',
            path: ['options', optionIndex, 'text'],
            message: id.editor.validation.optionRequired,
          })
        }
      })

      const texts = question.options
        .map((option) => option.text.trim().toLowerCase())
        .filter(Boolean)
      if (new Set(texts).size !== texts.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: id.editor.validation.optionDuplicate,
        })
      }
    }

    if (question.type === 'text') {
      if (question.acceptedAnswers.length < 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['acceptedAnswers'],
          message: id.editor.validation.acceptedRequired,
        })
      }

      question.acceptedAnswers.forEach((answer, answerIndex) => {
        if (!answer.text) {
          ctx.addIssue({
            code: 'custom',
            path: ['acceptedAnswers', answerIndex, 'text'],
            message: id.editor.validation.acceptedRequired,
          })
        }
      })
    }
  })

function isWholeNumberInRange(value: string, min: number, max: number): boolean {
  return /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max
}

export const quizFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, id.editor.validation.titleRequired)
      .max(120, id.editor.validation.titleMax),
    description: z.string().trim(),
    status: z.enum(['draft', 'published']),
    revealAnswers: z.boolean(),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    timerMode: z.enum(['none', 'per_question', 'total']),
    perQuestionSeconds: z.string().trim(),
    totalMinutes: z.string().trim(),
    questions: z
      .array(questionSchema)
      .min(1, id.editor.validation.questionRequired)
      .max(50, id.editor.validation.questionMax),
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
        message: id.editor.validation.timerPerQuestionRange,
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
        message: id.editor.validation.timerTotalRange,
      })
    }
  })

export type QuizFormValues = z.infer<typeof quizFormSchema>
export type QuizFormQuestion = QuizFormValues['questions'][number]

export function makeEditorKey(): string {
  return crypto.randomUUID()
}

export function createBlankOption() {
  return { key: makeEditorKey(), text: '' }
}

export function createBlankAcceptedAnswer() {
  return { key: makeEditorKey(), text: '' }
}

export function createBlankQuestion(type: QuestionType): QuizFormQuestion {
  return {
    key: makeEditorKey(),
    type,
    body: '',
    points: '1',
    explanation: '',
    options: type === 'multiple_choice' ? [createBlankOption(), createBlankOption()] : [],
    correctOptionKey: '',
    acceptedAnswers: type === 'text' ? [createBlankAcceptedAnswer()] : [],
  }
}

export function emptyQuizFormValues(): QuizFormValues {
  return {
    title: '',
    description: '',
    status: 'draft',
    revealAnswers: true,
    shuffleQuestions: true,
    shuffleOptions: true,
    timerMode: 'none',
    perQuestionSeconds: String(DEFAULT_PER_QUESTION_SECONDS),
    totalMinutes: String(DEFAULT_TOTAL_MINUTES),
    questions: [],
  }
}

export function totalMinutesFromSeconds(seconds: number): string {
  return String(Math.max(1, Math.ceil(seconds / 60)))
}

export function mapEditorDataToForm(data: QuizEditorData): QuizFormValues {
  return {
    title: data.title,
    description: data.description,
    status: data.status,
    revealAnswers: data.revealAnswers,
    shuffleQuestions: data.shuffleQuestions,
    shuffleOptions: data.shuffleOptions,
    timerMode: data.timer.mode,
    perQuestionSeconds:
      data.timer.mode === 'per_question'
        ? String(data.timer.seconds)
        : String(DEFAULT_PER_QUESTION_SECONDS),
    totalMinutes:
      data.timer.mode === 'total'
        ? totalMinutesFromSeconds(data.timer.seconds)
        : String(DEFAULT_TOTAL_MINUTES),
    questions: data.questions.map((question) => ({
      key: question.key,
      type: question.type,
      body: question.body,
      points: String(question.points),
      explanation: question.explanation,
      options: question.options.map((option) => ({ ...option })),
      correctOptionKey: question.correctOptionKey,
      acceptedAnswers: question.acceptedAnswers.map((answer) => ({ ...answer })),
    })),
  }
}

export type QuizFormMeta = {
  id?: string
  source: QuizSource
  materialId: string | null
  baseSettings: QuizSettings
}

export function buildQuizSettings(
  values: QuizFormValues,
  baseSettings: QuizSettings = {},
): QuizSettings {
  const timer: QuizTimerSettings =
    values.timerMode === 'per_question'
      ? { mode: 'per_question', seconds: Number(values.perQuestionSeconds) }
      : values.timerMode === 'total'
        ? { mode: 'total', seconds: Number(values.totalMinutes) * 60 }
        : { mode: 'none' }

  return {
    ...baseSettings,
    reveal_answers: values.revealAnswers,
    shuffle_questions: values.shuffleQuestions,
    shuffle_options: values.shuffleOptions,
    timer,
  }
}

export function buildQuizSavePayload(
  values: QuizFormValues,
  meta: QuizFormMeta,
): QuizSavePayload {
  return {
    ...(meta.id ? { id: meta.id } : {}),
    material_id: meta.materialId,
    title: values.title,
    description: values.description.trim() || null,
    source: meta.source,
    status: values.status,
    settings: buildQuizSettings(values, meta.baseSettings),
    questions: values.questions.map((question) => {
      if (question.type === 'text') {
        return {
          type: 'text' as const,
          body: question.body,
          accepted_answers: question.acceptedAnswers.map((answer) => answer.text),
          explanation: question.explanation.trim() || undefined,
          points: Number(question.points),
        }
      }

      const correctIndex = question.options.findIndex(
        (option) => option.key === question.correctOptionKey,
      )

      return {
        type: 'multiple_choice' as const,
        body: question.body,
        options: question.options.map((option) => option.text),
        correct_index: correctIndex < 0 ? 0 : correctIndex,
        explanation: question.explanation.trim() || undefined,
        points: Number(question.points),
      }
    }),
  }
}
