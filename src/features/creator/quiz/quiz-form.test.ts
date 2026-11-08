import { describe, expect, it } from 'vitest'
import { id } from '@/i18n/id'
import {
  buildQuizSavePayload,
  createBlankQuestion,
  emptyQuizFormValues,
  quizFormSchema,
} from './quiz-form'

function messages(result: ReturnType<typeof quizFormSchema.safeParse>): string[] {
  if (result.success) return []
  return result.error.issues.map((issue) => issue.message)
}

describe('quizFormSchema', () => {
  it('mewajibkan judul dan minimal satu soal', () => {
    const result = quizFormSchema.safeParse(emptyQuizFormValues())

    expect(result.success).toBe(false)
    expect(messages(result)).toEqual(
      expect.arrayContaining([
        id.editor.validation.titleRequired,
        id.editor.validation.questionRequired,
      ]),
    )
  })

  it('mewajibkan jawaban benar pada pilihan ganda', () => {
    const question = {
      ...createBlankQuestion('multiple_choice'),
      body: '1 + 1 = ?',
      options: [
        { key: 'a', text: '1' },
        { key: 'b', text: '2' },
      ],
    }

    const result = quizFormSchema.safeParse({
      ...emptyQuizFormValues(),
      title: 'Matematika',
      questions: [question],
    })

    expect(result.success).toBe(false)
    expect(messages(result)).toContain(id.editor.validation.correctRequired)
  })

  it('menolak pilihan jawaban duplikat', () => {
    const question = {
      ...createBlankQuestion('multiple_choice'),
      body: '1 + 1 = ?',
      options: [
        { key: 'a', text: '2' },
        { key: 'b', text: ' 2 ' },
      ],
      correctOptionKey: 'a',
    }

    const result = quizFormSchema.safeParse({
      ...emptyQuizFormValues(),
      title: 'Matematika',
      questions: [question],
    })

    expect(result.success).toBe(false)
    expect(messages(result)).toContain(id.editor.validation.optionDuplicate)
  })

  it('mewajibkan jawaban yang diterima pada isian singkat', () => {
    const question = {
      ...createBlankQuestion('text'),
      body: 'Ibu kota Indonesia?',
      acceptedAnswers: [],
    }

    const result = quizFormSchema.safeParse({
      ...emptyQuizFormValues(),
      title: 'IPS',
      questions: [question],
    })

    expect(result.success).toBe(false)
    expect(messages(result)).toContain(id.editor.validation.acceptedRequired)
  })

  it('mengabaikan isian tersembunyi saat jenis soal diganti', () => {
    const textQuestion = {
      ...createBlankQuestion('text'),
      body: 'Ibu kota Indonesia?',
      options: [
        { key: 'a', text: '' },
        { key: 'b', text: '' },
      ],
      acceptedAnswers: [{ key: 'c', text: 'Jakarta' }],
    }

    const multipleChoiceQuestion = {
      ...createBlankQuestion('multiple_choice'),
      body: '1 + 1 = ?',
      options: [
        { key: 'a', text: '1' },
        { key: 'b', text: '2' },
      ],
      correctOptionKey: 'b',
      acceptedAnswers: [{ key: 'c', text: '' }],
    }

    const result = quizFormSchema.safeParse({
      ...emptyQuizFormValues(),
      title: 'Campuran',
      questions: [textQuestion, multipleChoiceQuestion],
    })

    expect(result.success).toBe(true)
  })
})

describe('buildQuizSavePayload', () => {
  it('memetakan pilihan ganda dan metadata dengan benar', () => {
    const question = {
      ...createBlankQuestion('multiple_choice'),
      body: '1 + 1 = ?',
      points: '2',
      explanation: ' Tambahkan angka. ',
      options: [
        { key: 'a', text: ' 1 ' },
        { key: 'b', text: ' 2 ' },
      ],
      correctOptionKey: 'b',
    }

    const values = quizFormSchema.parse({
      title: ' Matematika ',
      description: ' Latihan tambah ',
      status: 'published',
      revealAnswers: false,
      questions: [question],
    })

    const payload = buildQuizSavePayload(values, {
      id: 'quiz-1',
      source: 'ai',
      materialId: 'material-1',
    })

    expect(payload).toMatchObject({
      id: 'quiz-1',
      material_id: 'material-1',
      title: 'Matematika',
      description: 'Latihan tambah',
      source: 'ai',
      status: 'published',
      settings: { reveal_answers: false },
    })
    expect(payload.questions).toEqual([
      {
        type: 'multiple_choice',
        body: '1 + 1 = ?',
        options: ['1', '2'],
        correct_index: 1,
        explanation: 'Tambahkan angka.',
        points: 2,
      },
    ])
  })

  it('memetakan isian singkat dan variasi jawaban', () => {
    const question = {
      ...createBlankQuestion('text'),
      body: 'Ibu kota Indonesia?',
      acceptedAnswers: [
        { key: 'a', text: ' Jakarta ' },
        { key: 'b', text: ' DKI Jakarta ' },
      ],
    }

    const values = quizFormSchema.parse({
      ...emptyQuizFormValues(),
      title: 'IPS',
      questions: [question],
    })

    const payload = buildQuizSavePayload(values, {
      source: 'manual',
      materialId: null,
    })

    expect(payload.id).toBeUndefined()
    expect(payload.material_id).toBeNull()
    expect(payload.questions).toEqual([
      {
        type: 'text',
        body: 'Ibu kota Indonesia?',
        accepted_answers: ['Jakarta', 'DKI Jakarta'],
        explanation: undefined,
        points: 1,
      },
    ])
  })
})
