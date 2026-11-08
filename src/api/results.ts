import { supabase } from '@/lib/supabase'
import type { AttemptRow, QuizStatus } from '@/types/database'
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
