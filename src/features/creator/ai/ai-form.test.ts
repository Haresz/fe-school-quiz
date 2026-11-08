import { describe, expect, it } from 'vitest'
import { id } from '@/i18n/id'
import {
  aiFormSchema,
  buildGenerateInput,
  emptyAiFormValues,
} from './ai-form'

function messages(result: ReturnType<typeof aiFormSchema.safeParse>): string[] {
  if (result.success) return []
  return result.error.issues.map((issue) => issue.message)
}

describe('aiFormSchema', () => {
  it('menerima nilai awal dengan materi yang dipilih', () => {
    const result = aiFormSchema.safeParse({
      ...emptyAiFormValues(),
      materialId: 'material-1',
    })

    expect(result.success).toBe(true)
  })

  it('mewajibkan materi dan membatasi jumlah soal 1 sampai 20', () => {
    const missingMaterial = aiFormSchema.safeParse(emptyAiFormValues())
    expect(missingMaterial.success).toBe(false)
    expect(messages(missingMaterial)).toContain(id.ai.validation.materialRequired)

    for (const value of ['0', '21', '1.5']) {
      const result = aiFormSchema.safeParse({
        ...emptyAiFormValues(),
        materialId: 'material-1',
        numQuestions: value,
      })
      expect(result.success).toBe(false)
      expect(messages(result)).toContain(id.ai.validation.countRange)
    }
  })

  it('menolak arahan tambahan lebih dari 500 karakter', () => {
    const result = aiFormSchema.safeParse({
      ...emptyAiFormValues(),
      materialId: 'material-1',
      prompt: 'a'.repeat(501),
    })

    expect(result.success).toBe(false)
    expect(messages(result)).toContain(id.ai.validation.promptMax)
  })
})

describe('buildGenerateInput', () => {
  it('mengubah jumlah soal menjadi angka dan merapikan prompt', () => {
    expect(
      buildGenerateInput({
        materialId: 'material-1',
        prompt: '  Fokus soal cerita.  ',
        numQuestions: '8',
        mix: 'mixed',
        difficulty: 'sedang',
      }),
    ).toEqual({
      materialId: 'material-1',
      prompt: 'Fokus soal cerita.',
      numQuestions: 8,
      mix: 'mixed',
      difficulty: 'sedang',
    })
  })
})
