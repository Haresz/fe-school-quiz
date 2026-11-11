import { supabase } from '@/lib/supabase'
import { normalizeQuizCode } from '@/lib/quiz-code'
import {
  asArray,
  asRecord,
  readBoolean,
  readNumber,
  readRecord,
  readString,
  readStringArray,
} from '@/lib/unknown'
import { readQuizTimer } from '@/lib/quiz-settings'
import type {
  Json,
  QuestionType,
  QuizSettings,
  QuizStatus,
  QuizTimerSettings,
} from '@/types/database'
import {
  PlayerApiError,
  mapPlayerLoadError,
  mapPlayerSubmitError,
} from './player-errors'

export type PlayerQuestion = {
  id: string
  position: number
  type: QuestionType
  body: string
  options: string[] | null
  points: number
}

export type PlayerQuiz = {
  id: string
  title: string
  description: string | null
  status: QuizStatus | null
  revealAnswers: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  timer: QuizTimerSettings
  questions: PlayerQuestion[]
}

export type PlayerAnswer = {
  question_id: string
  answer: number | string | null
}

export type PlayerReview = {
  questionId: string
  isCorrect: boolean
  pointsAwarded: number
  correctAnswer: string | null
  correctIndex: number | null
  explanation: string | null
}

export type PlayerAttemptResult = {
  attemptId: string
  score: number
  maxScore: number
  reviews: PlayerReview[]
}

export type SubmitAttemptInput = {
  code: string
  participantName: string
  answers: PlayerAnswer[]
  fallbackMaxScore: number
}

function normalizeQuestion(raw: unknown, index: number): PlayerQuestion {
  const record = asRecord(raw)
  if (!record) throw new PlayerApiError('invalid_quiz')

  const id = readString(record.id) ?? readString(record.question_id)
  const body = readString(record.body)?.trim()
  const type = readString(record.type)

  if (!id || !body || (type !== 'multiple_choice' && type !== 'text')) {
    throw new PlayerApiError('invalid_quiz')
  }

  const options = readStringArray(record.options) ?? null
  if (type === 'multiple_choice' && (!options || options.length < 2)) {
    throw new PlayerApiError('invalid_quiz')
  }

  const pointsValue = readNumber(record.points)
  const points =
    pointsValue != null && pointsValue > 0 ? Math.trunc(pointsValue) : 1

  return {
    id,
    position: readNumber(record.position) ?? index + 1,
    type,
    body,
    options: type === 'multiple_choice' ? options : null,
    points,
  }
}

function normalizeQuiz(data: unknown): PlayerQuiz {
  const root = asRecord(Array.isArray(data) ? data[0] : data)
  const quizRecord = asRecord(root?.quiz) ?? root
  const questionsValue = asArray(root?.questions) ?? asArray(quizRecord?.questions)

  if (!quizRecord || !questionsValue || questionsValue.length === 0) {
    throw new PlayerApiError('invalid_quiz')
  }

  const id = readString(quizRecord.id) ?? readString(quizRecord.quiz_id)
  const title = readString(quizRecord.title)?.trim()
  const status = readString(quizRecord.status) ?? null

  if (!id || !title) throw new PlayerApiError('invalid_quiz')
  if (status === 'draft') throw new PlayerApiError('quiz_not_published')

  const settings = (readRecord(quizRecord.settings) ?? {}) as QuizSettings
  const revealAnswers =
    readBoolean(settings.reveal_answers) ??
    readBoolean(quizRecord.reveal_answers) ??
    readBoolean(quizRecord.revealAnswers) ??
    false
  const shuffleQuestions = readBoolean(settings.shuffle_questions) ?? false
  const shuffleOptions = readBoolean(settings.shuffle_options) ?? false
  const timer = readQuizTimer(settings.timer)

  const questions = questionsValue
    .map((question, index) => normalizeQuestion(question, index))
    .sort((first, second) => first.position - second.position)

  const questionIds = new Set(questions.map((question) => question.id))
  if (questionIds.size !== questions.length) {
    throw new PlayerApiError('invalid_quiz')
  }

  return {
    id,
    title,
    description: readString(quizRecord.description)?.trim() || null,
    status: (status as QuizStatus | null) ?? null,
    revealAnswers,
    shuffleQuestions,
    shuffleOptions,
    timer,
    questions,
  }
}

function normalizeReview(raw: unknown): PlayerReview | undefined {
  const record = asRecord(raw)
  if (!record) return undefined

  const questionId =
    readString(record.question_id) ?? readString(record.questionId)
  if (!questionId) return undefined

  const acceptedAnswers = readStringArray(record.accepted_answers)
  const correctAnswer =
    readString(record.correct_answer) ??
    readString(record.correctAnswer) ??
    (acceptedAnswers ? acceptedAnswers.join(', ') : null)

  return {
    questionId,
    isCorrect:
      readBoolean(record.is_correct) ?? readBoolean(record.isCorrect) ?? false,
    pointsAwarded:
      readNumber(record.points_awarded) ??
      readNumber(record.pointsAwarded) ??
      0,
    correctAnswer: correctAnswer?.trim() || null,
    correctIndex:
      readNumber(record.correct_index) ?? readNumber(record.correctIndex) ?? null,
    explanation: readString(record.explanation)?.trim() || null,
  }
}

function normalizeAttempt(
  data: unknown,
  fallbackMaxScore: number,
): PlayerAttemptResult {
  const root = asRecord(Array.isArray(data) ? data[0] : data)
  if (!root) throw new PlayerApiError('attempt_failed')

  const rawReviews =
    asArray(root.reviews) ??
    asArray(root.review) ??
    asArray(root.answers) ??
    asArray(root.results) ??
    []

  const reviews = rawReviews
    .map(normalizeReview)
    .filter((review): review is PlayerReview => review !== undefined)

  const scoreFromReviews = reviews.reduce(
    (total, review) => total + review.pointsAwarded,
    0,
  )
  const score = readNumber(root.score) ?? scoreFromReviews
  const maxScore =
    readNumber(root.max_score) ??
    readNumber(root.maxScore) ??
    readNumber(root.total_points) ??
    fallbackMaxScore

  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    throw new PlayerApiError('attempt_failed')
  }

  return {
    attemptId: readString(root.attempt_id) ?? readString(root.id) ?? '',
    score,
    maxScore,
    reviews,
  }
}

export async function getQuizByCode(code: string): Promise<PlayerQuiz> {
  const normalizedCode = normalizeQuizCode(code)
  if (normalizedCode.length === 0) {
    throw new PlayerApiError('quiz_not_found')
  }

  const { data, error } = await supabase.rpc('get_quiz_by_code', {
    p_code: normalizedCode,
  })

  if (error) throw mapPlayerLoadError(error)

  return normalizeQuiz(data)
}

export async function submitAttempt(
  input: SubmitAttemptInput,
): Promise<PlayerAttemptResult> {
  const { data, error } = await supabase.rpc('submit_attempt', {
    p_code: normalizeQuizCode(input.code),
    p_name: input.participantName.trim(),
    p_answers: input.answers as unknown as Json,
  })

  if (error) throw mapPlayerSubmitError(error)

  return normalizeAttempt(data, input.fallbackMaxScore)
}
