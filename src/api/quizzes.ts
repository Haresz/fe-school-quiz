import { supabase } from '@/lib/supabase'
import type {
  Json,
  QuestionRow,
  QuizSettings,
  QuizSource,
  QuizStatus,
  QuestionType,
} from '@/types/database'
import { QuizApiError, mapQuizError, mapQuizLoadError } from './quiz-errors'

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
  revealAnswers: boolean
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

type QuizRecord = {
  id: string
  material_id: string | null
  title: string
  description: string | null
  source: QuizSource
  status: QuizStatus
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
  const [quizResult, questionsResult] = await Promise.all([
    supabase
      .from('quizzes')
      .select('id, material_id, title, description, source, status, settings')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('questions')
      .select('id, quiz_id, position, type, body, options, explanation, points')
      .eq('quiz_id', id)
      .order('position', { ascending: true }),
  ])

  if (quizResult.error) throw mapQuizLoadError(quizResult.error)
  if (!quizResult.data) throw new QuizApiError('quiz_not_found')

  if (questionsResult.error) throw mapQuizLoadError(questionsResult.error)

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
    revealAnswers: settings.reveal_answers === true,
    questions: questions.map((question) => mapQuestion(question, keysById.get(question.id))),
  }
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
