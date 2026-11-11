import { describe, expect, it } from 'vitest'
import type { PlayerQuiz } from '@/api/player'
import { createQuizSession, type RandomInt } from './quiz-session'

function makeQuiz(overrides: Partial<PlayerQuiz> = {}): PlayerQuiz {
  return {
    id: 'quiz-1',
    title: 'Pecahan kelas 5',
    description: null,
    status: 'published',
    revealAnswers: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    timer: { mode: 'none' },
    questions: [
      {
        id: 'q1',
        position: 1,
        type: 'multiple_choice',
        body: '1/2 + 1/4 = ?',
        options: ['1/4', '3/4', '1'],
        points: 1,
      },
      {
        id: 'q2',
        position: 2,
        type: 'multiple_choice',
        body: '2/4 = ?',
        options: ['1/2', '2/3'],
        points: 1,
      },
      {
        id: 'q3',
        position: 3,
        type: 'text',
        body: 'Ibu kota Indonesia?',
        options: null,
        points: 2,
      },
    ],
    ...overrides,
  }
}

function constantRandomInt(value: number): RandomInt {
  return () => value
}

describe('createQuizSession', () => {
  it('tidak mengacak apa pun saat pengaturan acak mati', () => {
    const quiz = makeQuiz()
    const session = createQuizSession(quiz, constantRandomInt(0))

    expect(session.questionOrder).toEqual(['q1', 'q2', 'q3'])
    expect(session.optionOrders).toEqual({
      q1: [0, 1, 2],
      q2: [0, 1],
      q3: [],
    })
  })

  it('menghasilkan permutasi soal yang valid saat soal diacak', () => {
    const quiz = makeQuiz({ shuffleQuestions: true })

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const session = createQuizSession(quiz)

      expect(session.questionOrder).toHaveLength(quiz.questions.length)
      expect([...session.questionOrder].sort()).toEqual(['q1', 'q2', 'q3'])
      expect(new Set(session.questionOrder).size).toBe(quiz.questions.length)
    }
  })

  it('menghasilkan permutasi opsi yang valid per soal saat opsi diacak', () => {
    const quiz = makeQuiz({ shuffleOptions: true })

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const session = createQuizSession(quiz)

      for (const question of quiz.questions) {
        const order = session.optionOrders[question.id]
        const optionCount = question.options?.length ?? 0

        expect(order).toHaveLength(optionCount)
        expect([...order].sort((first, second) => first - second)).toEqual(
          Array.from({ length: optionCount }, (_, index) => index),
        )
      }
    }
  })

  it('tidak memutasi data kuis dari API', () => {
    const quiz = makeQuiz({ shuffleQuestions: true, shuffleOptions: true })
    const snapshot = structuredClone(quiz)

    createQuizSession(quiz)

    expect(quiz).toEqual(snapshot)
  })

  it('stabil untuk rng yang sama dalam satu sesi', () => {
    const quiz = makeQuiz({ shuffleQuestions: true, shuffleOptions: true })
    const session = createQuizSession(quiz, constantRandomInt(1))
    const repeat = createQuizSession(quiz, constantRandomInt(1))

    expect(repeat).toEqual(session)
  })

  it('menghasilkan urutan berbeda untuk rng berbeda', () => {
    const quiz = makeQuiz({ shuffleQuestions: true, shuffleOptions: true })

    const first = createQuizSession(quiz, constantRandomInt(0))
    const second = createQuizSession(quiz, constantRandomInt(1))

    expect(first.questionOrder).not.toEqual(second.questionOrder)
  })
})
