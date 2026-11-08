import { describe, expect, it } from 'vitest'
import { mapQuizError, mapQuizLoadError, QuizApiError } from './quiz-errors'

describe('mapQuizError', () => {
  it('memetakan kode error dari save_quiz', () => {
    expect(mapQuizError({ message: 'not_authenticated' }).code).toBe('not_authenticated')
    expect(mapQuizError({ message: 'quiz_not_found' }).code).toBe('quiz_not_found')
    expect(mapQuizError({ message: 'quiz_has_attempts' }).code).toBe('quiz_has_attempts')
  })

  it('menyimpan detail invalid_quiz', () => {
    const error = mapQuizError({ message: 'invalid_quiz: title harus 1-120 karakter' })

    expect(error.code).toBe('invalid_quiz')
    expect(error.detail).toBe('title harus 1-120 karakter')
  })

  it('memetakan gangguan jaringan', () => {
    expect(mapQuizError({ name: 'AuthRetryableFetchError' }).code).toBe('network')
    expect(mapQuizError({ message: 'Failed to fetch' }).code).toBe('network')
  })

  it('mempertahankan error yang sudah dipetakan', () => {
    const error = new QuizApiError('unknown')
    expect(mapQuizError(error)).toBe(error)
  })
})

describe('mapQuizLoadError', () => {
  it('memakai load_failed untuk error query umum', () => {
    expect(mapQuizLoadError({ message: 'permission denied' }).code).toBe('load_failed')
  })

  it('mempertahankan quiz_not_found dan network', () => {
    expect(mapQuizLoadError({ message: 'quiz_not_found' }).code).toBe('quiz_not_found')
    expect(mapQuizLoadError({ message: 'Failed to fetch' }).code).toBe('network')
  })
})
