import { z } from 'zod'
import type { GenerateQuizInput } from '@/api/ai'
import { id } from '@/i18n/id'

export const aiFormSchema = z.object({
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
})

export type AiFormValues = z.infer<typeof aiFormSchema>

export function emptyAiFormValues(): AiFormValues {
  return {
    materialId: '',
    prompt: '',
    numQuestions: '5',
    mix: 'mixed',
    difficulty: 'sedang',
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
