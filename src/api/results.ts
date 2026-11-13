import { supabase } from '@/lib/supabase'
import {
  asArray,
  asRecord,
  readBoolean,
  readNumber,
  readRecord,
  readString,
  readStringArray,
} from '@/lib/unknown'
import type { AttemptRow, QuestionType, QuizStatus } from '@/types/database'
import { QuizApiError, mapQuizLoadError } from './quiz-errors'

export type QuizResultsQuiz = {
  id: string
  title: string
  status: QuizStatus
  shareCode: string
}

export type QuizAttemptSummary = {
  id: string
  participantName: string
  score: number
  maxScore: number
  createdAt: string
}

export type QuizResults = {
  quiz: QuizResultsQuiz
  attempts: QuizAttemptSummary[]
}

export type QuizAttemptAnswer = {
  questionId: string
  position: number | null
  body: string
  type: QuestionType
  options: string[] | null
  answer: number | string | null
  isCorrect: boolean
  pointsAwarded: number
  points: number | null
  correctIndex: number | null
  correctAnswer: string | null
  explanation: string | null
}

export type QuizAttemptDetail = {
  attemptId: string
  quizId: string
  quizTitle: string
  participantName: string
  score: number
  maxScore: number
  createdAt: string | null
  answers: QuizAttemptAnswer[]
}

export type QuizQuestionStat = {
  questionId: string
  position: number | null
  body: string
  correctCount: number
  answeredCount: number
  correctRate: number
}

export type QuizStats = {
  attemptCount: number | null
  averageScore: number | null
  maxScore: number | null
  questionStats: QuizQuestionStat[]
}

type QuizResultRecord = {
  id: string
  title: string
  status: QuizStatus
  share_code: string
}

type AttemptResultRecord = Pick<
  AttemptRow,
  'id' | 'participant_name' | 'score' | 'max_score' | 'created_at'
>

export async function getQuizResults(
  quizId: string,
  ownerId: string,
): Promise<QuizResults> {
  const quizResult = await supabase
    .from('quizzes')
    .select('id, title, status, share_code')
    .eq('id', quizId)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (quizResult.error) throw mapQuizLoadError(quizResult.error)
  if (!quizResult.data) throw new QuizApiError('quiz_not_found')

  const quiz = quizResult.data as QuizResultRecord

  const attemptsResult = await supabase
    .from('attempts')
    .select('id, participant_name, score, max_score, created_at')
    .eq('quiz_id', quiz.id)
    .order('created_at', { ascending: false })

  if (attemptsResult.error) throw mapQuizLoadError(attemptsResult.error)

  const attempts = ((attemptsResult.data ?? []) as AttemptResultRecord[]).map(
    (attempt) => ({
      id: attempt.id,
      participantName: attempt.participant_name,
      score: attempt.score,
      maxScore: attempt.max_score,
      createdAt: attempt.created_at,
    }),
  )

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      status: quiz.status,
      shareCode: quiz.share_code,
    },
    attempts,
  }
}

function readAnswer(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return value
  const record = asRecord(value)
  if (record) return readAnswer(record.answer ?? record.value)
  return null
}

function readQuestionType(value: unknown): QuestionType {
  return value === 'text' ? 'text' : 'multiple_choice'
}

function normalizeAttemptAnswer(
  raw: unknown,
): QuizAttemptAnswer | undefined {
  const record = asRecord(raw)
  if (!record) return undefined

  const question = asRecord(record.question) ?? record
  const questionId =
    readString(record.question_id) ??
    readString(record.questionId) ??
    readString(question.id) ??
    readString(record.id)
  if (!questionId) return undefined

  const acceptedAnswers = readStringArray(record.accepted_answers)
  const correctAnswer =
    readString(record.correct_answer) ??
    readString(question.correct_answer) ??
    (acceptedAnswers ? acceptedAnswers.join(', ') : null)
  const points = readNumber(record.points) ?? readNumber(question.points)
  const isCorrect =
    readBoolean(record.is_correct) ?? readBoolean(record.isCorrect) ?? false

  return {
    questionId,
    position: readNumber(record.position) ?? readNumber(question.position) ?? null,
    body:
      readString(question.body) ??
      readString(record.question_body) ??
      readString(record.body) ??
      '',
    type: readQuestionType(record.type ?? question.type),
    options: readStringArray(record.options) ?? readStringArray(question.options) ?? null,
    answer: readAnswer(record.answer),
    isCorrect,
    pointsAwarded:
      readNumber(record.points_awarded) ??
      readNumber(record.pointsAwarded) ??
      (isCorrect ? (points ?? 0) : 0),
    points: points ?? null,
    correctIndex:
      readNumber(record.correct_index) ??
      readNumber(record.correctIndex) ??
      readNumber(question.correct_index) ??
      null,
    correctAnswer: correctAnswer?.trim() || null,
    explanation:
      readString(record.explanation)?.trim() ||
      readString(question.explanation)?.trim() ||
      null,
  }
}

function normalizeAttemptDetail(
  data: unknown,
  fallbackAttemptId: string,
): QuizAttemptDetail {
  const rows = asArray(data)
  const root = readRecord(rows ? rows[0] : data)
  if (!root) throw new QuizApiError('attempt_not_found')

  const attempt = asRecord(root.attempt) ?? root
  const attemptId =
    readString(attempt.attempt_id) ??
    readString(attempt.id) ??
    fallbackAttemptId

  if (!attemptId) throw new QuizApiError('attempt_not_found')

  const rawAnswers =
    asArray(root.items) ??
    asArray(attempt.answers) ??
    asArray(attempt.reviews) ??
    asArray(root.answers) ??
    asArray(root.reviews) ??
    asArray(root.review) ??
    []

  const answers = rawAnswers
    .map((raw) => normalizeAttemptAnswer(raw))
    .filter((answer): answer is QuizAttemptAnswer => answer !== undefined)
    .sort((a, b) => {
      const positionA = a.position ?? Number.MAX_SAFE_INTEGER
      const positionB = b.position ?? Number.MAX_SAFE_INTEGER
      return positionA - positionB
    })

  const score =
    readNumber(attempt.score) ??
    answers.reduce((total, answer) => total + answer.pointsAwarded, 0)
  const maxScore =
    readNumber(attempt.max_score) ??
    readNumber(attempt.maxScore) ??
    readNumber(root.max_score) ??
    answers.reduce((total, answer) => total + (answer.points ?? 0), 0)

  return {
    attemptId,
    quizId:
      readString(attempt.quiz_id) ??
      readString(attempt.quizId) ??
      readString(root.quiz_id) ??
      '',
    quizTitle:
      readString(attempt.quiz_title) ??
      readString(attempt.quizTitle) ??
      readString(root.quiz_title) ??
      readString(root.title) ??
      '',
    participantName:
      readString(attempt.participant_name) ??
      readString(attempt.participantName) ??
      '',
    score,
    maxScore,
    createdAt:
      readString(attempt.created_at) ?? readString(attempt.createdAt) ?? null,
    answers,
  }
}

function normalizeRate(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * (value <= 1 ? 100 : 1))))
}

function normalizeQuestionStat(raw: unknown): QuizQuestionStat | undefined {
  const record = asRecord(raw)
  if (!record) return undefined

  const questionId =
    readString(record.question_id) ??
    readString(record.questionId) ??
    readString(record.id)
  if (!questionId) return undefined

  const correctCount =
    readNumber(record.correct_count) ??
    readNumber(record.correctCount) ??
    readNumber(record.correct) ??
    0
  const answeredCount =
    readNumber(record.answered_count) ??
    readNumber(record.answeredCount) ??
    readNumber(record.total_answers) ??
    readNumber(record.totalAnswers) ??
    readNumber(record.answers_count) ??
    readNumber(record.answersCount) ??
    readNumber(record.total) ??
    0
  const providedRate =
    readNumber(record.correct_rate) ?? readNumber(record.correctRate)
  const providedPercent =
    readNumber(record.correct_pct) ?? readNumber(record.correctPct)
  const correctRate =
    providedRate !== undefined
      ? normalizeRate(providedRate)
      : providedPercent !== undefined
        ? Math.min(100, Math.max(0, Math.round(providedPercent)))
        : answeredCount > 0
          ? Math.min(100, Math.max(0, Math.round((correctCount / answeredCount) * 100)))
          : 0

  return {
    questionId,
    position:
      readNumber(record.position) ?? readNumber(record.question_position) ?? null,
    body:
      readString(record.body) ??
      readString(record.question_body) ??
      readString(record.questionBody) ??
      '',
    correctCount,
    answeredCount,
    correctRate,
  }
}

function normalizeQuizStats(data: unknown): QuizStats {
  const rows = asArray(data)
  const root = rows ? undefined : readRecord(data)

  const rawStats =
    rows ??
    asArray(root?.questions) ??
    asArray(root?.question_stats) ??
    asArray(root?.questionStats) ??
    asArray(root?.stats) ??
    []

  const questionStats = rawStats
    .map(normalizeQuestionStat)
    .filter((stat): stat is QuizQuestionStat => stat !== undefined)
    .sort((a, b) => {
      const positionA = a.position ?? Number.MAX_SAFE_INTEGER
      const positionB = b.position ?? Number.MAX_SAFE_INTEGER
      return positionA - positionB
    })

  return {
    attemptCount:
      readNumber(root?.attempt_count) ??
      readNumber(root?.attemptCount) ??
      readNumber(root?.total_attempts) ??
      readNumber(root?.totalAttempts) ??
      null,
    averageScore:
      readNumber(root?.average_score) ?? readNumber(root?.averageScore) ?? null,
    maxScore: readNumber(root?.max_score) ?? readNumber(root?.maxScore) ?? null,
    questionStats,
  }
}

export async function getAttemptDetail(
  attemptId: string,
): Promise<QuizAttemptDetail> {
  const { data, error } = await supabase.rpc('get_attempt_detail', {
    p_attempt_id: attemptId,
  })

  if (error) throw mapQuizLoadError(error)

  return normalizeAttemptDetail(data, attemptId)
}

export async function getQuizStats(quizId: string): Promise<QuizStats> {
  const { data, error } = await supabase.rpc('get_quiz_stats', {
    p_quiz_id: quizId,
  })

  if (error) throw mapQuizLoadError(error)

  return normalizeQuizStats(data)
}
