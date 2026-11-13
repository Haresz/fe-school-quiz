import { describe, expect, it } from 'vitest'
import type { AiQuizDraft } from '@/api/ai'
import { mapAiDraftToForm } from './ai-draft'

const draft: AiQuizDraft = {
  material_id: 'material-1',
  title: 'Pecahan kelas 5',
  description: null,
  source: 'ai',
  status: 'draft',
  settings: { reveal_answers: false },
  questions: [
    {
      type: 'multiple_choice',
      body: '1/2 + 1/4 = ?',
      options: ['1/4', '3/4'],
      correct_index: 1,
      explanation: 'Samakan penyebut terlebih dulu.',
      points: 2,
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

describe('mapAiDraftToForm', () => {
  it('memetakan draf AI ke nilai form editor', () => {
    const result = mapAiDraftToForm(draft)

    expect(result).toMatchObject({
      title: 'Pecahan kelas 5',
      description: '',
      status: 'draft',
      revealAnswers: false,
    })
    expect(result.questions).toHaveLength(2)

    const [multipleChoice, text] = result.questions
    expect(multipleChoice).toMatchObject({
      type: 'multiple_choice',
      body: '1/2 + 1/4 = ?',
      points: '2',
      explanation: 'Samakan penyebut terlebih dulu.',
      correctOptionKey: multipleChoice.options[1].key,
    })
    expect(multipleChoice.options.map((option) => option.text)).toEqual([
      '1/4',
      '3/4',
    ])
    expect(multipleChoice.acceptedAnswers).toEqual([])

    expect(text).toMatchObject({
      type: 'text',
      body: 'Hasil 3/4 - 1/4?',
      points: '1',
      explanation: '',
      options: [],
      correctOptionKey: '',
    })
    expect(text.acceptedAnswers.map((answer) => answer.text)).toEqual([
      '1/2',
      '0,5',
    ])
  })

  it('memakai pengaturan tampilkan jawaban dari AI bila tersedia', () => {
    expect(
      mapAiDraftToForm({
        ...draft,
        settings: { reveal_answers: true },
      }).revealAnswers,
    ).toBe(true)
  })

  it('memetakan pengaturan acak dan timer dari draf AI', () => {
    const result = mapAiDraftToForm({
      ...draft,
      settings: {
        reveal_answers: true,
        shuffle_questions: false,
        shuffle_options: false,
        timer: { mode: 'total', seconds: 600 },
      },
    })

    expect(result).toMatchObject({
      revealAnswers: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      timerMode: 'total',
      totalMinutes: '10',
    })
  })
})
