import { supabase } from '@/lib/supabase'
import type {
  Json,
  QuestionRow,
  QuizSettings,
  QuizSource,
  QuizStatus,
  QuizTimerSettings,
  QuestionType,
} from '@/types/database'
import {
  readQuizTimer,
  readRevealAnswers,
} from '@/lib/quiz-settings'
import {
  QuizApiError,
  mapQuizDeleteError,
  mapQuizError,
  mapQuizLoadError,
} from './quiz-errors'

export type QuizEditorOption = {
  key: string
  text: string
}

export type QuizEditorAnswer = {
  key: string
  text: string
}

export type QuizEditorQuestion = {
  key: string
  type: QuestionType
  body: string
  points: number
  explanation: string
  options: QuizEditorOption[]
  correctOptionKey: string
  acceptedAnswers: QuizEditorAnswer[]
}

export type QuizEditorData = {
  id: string
  title: string
  description: string
  source: QuizSource
  status: QuizStatus
  materialId: string | null
  shareCode: string
  hasAttempts: boolean
  settings: QuizSettings
  revealAnswers: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  timer: QuizTimerSettings
  questions: QuizEditorQuestion[]
}

export type QuizMultipleChoicePayload = {
  type: 'multiple_choice'
  body: string
  options: string[]
  correct_index: number
  explanation?: string
  points: number
}

export type QuizTextPayload = {
  type: 'text'
  body: string
  accepted_answers: string[]
  explanation?: string
  points: number
}

export type QuizSavePayload = {
  id?: string
  material_id: string | null
  title: string
  description: string | null
  source: QuizSource
  status: QuizStatus
  settings: QuizSettings
  questions: Array<QuizMultipleChoicePayload | QuizTextPayload>
}

export type SavedQuiz = {
  id: string
  share_code: string
}

export type CreatorQuizSummary = {
  id: string
  title: string
  description: string | null
  status: QuizStatus
  source: QuizSource
  share_code: string
  created_at: string
  updated_at: string
}

type QuizRecord = {
  id: string
  material_id: string | null
  title: string
  description: string | null
  source: QuizSource
  status: QuizStatus
  share_code: string
  settings: QuizSettings | null
}

type QuestionKeyRecord = {
  question_id: string
  correct_index: number | null
  accepted_answers: string[] | null
}

function makeKey(): string {
  return crypto.randomUUID()
}

function mapQuestion(
  question: QuestionRow,
  questionKey: QuestionKeyRecord | undefined,
): QuizEditorQuestion {
  const options = Array.isArray(question.options)
    ? question.options.map((text) => ({ key: makeKey(), text }))
    : []

  const correctOption =
    questionKey?.correct_index != null ? options[questionKey.correct_index] : undefined

  const acceptedAnswers =
    question.type === 'text' && Array.isArray(questionKey?.accepted_answers)
      ? questionKey.accepted_answers.map((text) => ({ key: makeKey(), text }))
      : []

  return {
    key: makeKey(),
    type: question.type,
    body: question.body,
    points: question.points,
    explanation: question.explanation ?? '',
    options,
    correctOptionKey: correctOption?.key ?? '',
    acceptedAnswers,
  }
}

export async function getQuizForEdit(id: string): Promise<QuizEditorData> {
  const [quizResult, questionsResult, attemptsResult] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, material_id, title, description, source, status, share_code, settings')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('questions')
      .select('id, quiz_id, position, type, body, options, explanation, points')
      .eq('quiz_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', id),
  ])

  if (quizResult.error) throw mapQuizLoadError(quizResult.error)
  if (!quizResult.data) throw new QuizApiError('quiz_not_found')

  if (questionsResult.error) throw mapQuizLoadError(questionsResult.error)
  if (attemptsResult.error) throw mapQuizLoadError(attemptsResult.error)

  const quiz = quizResult.data as QuizRecord
  const questions = (questionsResult.data ?? []) as QuestionRow[]
  const questionIds = questions.map((question) => question.id)

  let keys: QuestionKeyRecord[] = []
  if (questionIds.length > 0) {
    const keysResult = await supabase
      .from('question_keys')
      .select('question_id, correct_index, accepted_answers')
      .in('question_id', questionIds)

    if (keysResult.error) throw mapQuizLoadError(keysResult.error)
    keys = (keysResult.data ?? []) as QuestionKeyRecord[]
  }

  const keysById = new Map(keys.map((key) => [key.question_id, key]))
  const settings = quiz.settings ?? {}

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? '',
    source: quiz.source,
    status: quiz.status,
    materialId: quiz.material_id,
    shareCode: quiz.share_code,
    hasAttempts: (attemptsResult.count ?? 0) > 0,
    settings,
    revealAnswers: readRevealAnswers(settings),
    shuffleQuestions: settings.shuffle_questions === true,
    shuffleOptions: settings.shuffle_options === true,
    timer: readQuizTimer(settings.timer),
    questions: questions.map((question) => mapQuestion(question, keysById.get(question.id))),
  }
}

export async function listCreatorQuizzes(
  ownerId: string,
): Promise<CreatorQuizSummary[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, description, status, source, share_code, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (error) throw mapQuizLoadError(error)

  return (data ?? []) as CreatorQuizSummary[]
}

export async function deleteQuiz(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)

  if (error) throw mapQuizDeleteError(error)
}

export type QuizMetaUpdate = {
  id: string
  title: string
  description: string | null
  settings: QuizSettings
}

export async function updateQuizMeta(input: QuizMetaUpdate): Promise<void> {
  const { data, error } = await supabase
    .from('quizzes')
    .update({
      title: input.title,
      description: input.description,
      settings: input.settings,
    })
    .eq('id', input.id)
    .select('id')
    .maybeSingle()

  if (error) throw mapQuizError(error)
  if (!data) throw new QuizApiError('quiz_not_found')
}

export async function saveQuiz(payload: QuizSavePayload): Promise<SavedQuiz> {
  const { data, error } = await supabase.rpc('save_quiz', {
    p_quiz: payload as unknown as Json,
  })

  if (error) throw mapQuizError(error)

  const result = data as { id?: unknown; share_code?: unknown } | null
  if (
    !result ||
    typeof result.id !== 'string' ||
    typeof result.share_code !== 'string'
  ) {
    throw new QuizApiError('unknown')
  }

  return { id: result.id, share_code: result.share_code }
}
