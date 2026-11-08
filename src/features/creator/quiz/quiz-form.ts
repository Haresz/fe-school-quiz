import { z } from 'zod'
import type { QuizEditorData, QuizSavePayload } from '@/api/quizzes'
import { id } from '@/i18n/id'
import type { QuestionType, QuizSource } from '@/types/database'

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

export const quizFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, id.editor.validation.titleRequired)
    .max(120, id.editor.validation.titleMax),
  description: z.string().trim(),
  status: z.enum(['draft', 'published']),
  revealAnswers: z.boolean(),
  questions: z
    .array(questionSchema)
    .min(1, id.editor.validation.questionRequired)
    .max(50, id.editor.validation.questionMax),
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
    questions: [],
  }
}

export function mapEditorDataToForm(data: QuizEditorData): QuizFormValues {
  return {
    title: data.title,
    description: data.description,
    status: data.status,
    revealAnswers: data.revealAnswers,
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
    settings: { reveal_answers: values.revealAnswers },
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
