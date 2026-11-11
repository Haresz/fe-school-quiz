import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  getAttemptDetail,
  type QuizAttemptAnswer,
  type QuizAttemptDetail,
} from '@/api/results'
import { QuizApiError } from '@/api/quiz-errors'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-context'
import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'
import { formatMessage } from '@/lib/message'
import { formatResultDate, percentOf } from './results-format'
import { resultsErrorMessage } from './results-error-message'

const choiceLetters = 'ABCDEFGHIJ'

function formatChoice(
  options: string[] | null,
  index: number | null,
): string | null {
  if (index === null) return null
  const letter = choiceLetters[index] ?? '?'
  const text = options?.[index]
  return text ? `${letter}. ${text}` : `${letter}.`
}

function formatStudentAnswer(answer: QuizAttemptAnswer): string | null {
  if (answer.answer === null) return null
  if (typeof answer.answer === 'number') {
    return formatChoice(answer.options, answer.answer) ?? String(answer.answer)
  }
  const trimmed = answer.answer.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatCorrectAnswer(answer: QuizAttemptAnswer): string | null {
  if (answer.correctIndex !== null) {
    return formatChoice(answer.options, answer.correctIndex)
  }
  return answer.correctAnswer
}

function AnswerCard({
  answer,
  index,
}: {
  answer: QuizAttemptAnswer
  index: number
}) {
  const titleId = `answer-${answer.questionId}-title`
  const studentAnswer = formatStudentAnswer(answer)
  const correctAnswer = formatCorrectAnswer(answer)
  const typeLabel =
    answer.type === 'multiple_choice'
      ? id.results.detail.typeMc
      : id.results.detail.typeText

  return (
    <li>
      <article aria-labelledby={titleId} className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-base font-bold text-ink-muted">
              {formatMessage(id.results.detail.question, {
                number: index + 1,
              })}{' '}
              · {typeLabel}
            </p>
            <h3
              id={titleId}
              className="break-words text-xl font-semibold text-ink"
            >
              {answer.body}
            </h3>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-pill px-3 py-1 text-base font-bold text-ink',
                answer.isCorrect ? 'bg-green-tint' : 'bg-yellow-tint',
              )}
            >
              {answer.isCorrect
                ? id.results.detail.correct
                : id.results.detail.incorrect}
            </span>
            {answer.points !== null ? (
              <span className="text-base font-bold text-ink-muted">
                {formatMessage(id.results.detail.pointsValue, {
                  points: answer.pointsAwarded,
                  max: answer.points,
                })}
              </span>
            ) : null}
          </div>
        </div>

        <dl className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-input border border-paper-line bg-paper p-3">
            <dt className="text-base font-bold text-ink-muted">
              {id.results.detail.studentAnswer}
            </dt>
            <dd
              className={cn(
                'break-words text-lg font-semibold',
                studentAnswer ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {studentAnswer ?? id.results.detail.noAnswer}
            </dd>
          </div>
          <div className="rounded-input border border-green-tint bg-green-tint/40 p-3">
            <dt className="text-base font-bold text-ink-muted">
              {id.results.detail.correctAnswer}
            </dt>
            <dd className="break-words text-lg font-semibold text-ink">
              {correctAnswer ?? id.results.detail.noAnswer}
            </dd>
          </div>
        </dl>

        {answer.explanation ? (
          <div className="space-y-1">
            <p className="text-base font-bold text-ink-muted">
              {id.results.detail.explanation}
            </p>
            <p className="max-w-prose text-base text-ink">
              {answer.explanation}
            </p>
          </div>
        ) : null}
      </article>
    </li>
  )
}

function DetailHeader({
  detail,
  quizId,
}: {
  detail: QuizAttemptDetail
  quizId: string
}) {
  const percent = percentOf(detail.score, detail.maxScore)

  return (
    <section className="relative overflow-hidden rounded-card border border-paper-line bg-white p-6">
      <div
        aria-hidden="true"
        className="notebook-lines pointer-events-none absolute inset-x-0 top-0 h-28 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <div className="relative space-y-5">
        <Link
          to={`/quizzes/${quizId}/results`}
          className="inline-flex min-h-11 items-center rounded-input px-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.results.detail.back}
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {id.results.detail.title}
            </h1>
            <p className="text-xl font-semibold text-ink">
              {detail.participantName}
            </p>
            <p className="max-w-prose text-base text-ink-muted">
              {detail.quizTitle || id.results.detail.subtitle}
            </p>
          </div>

          <div className="shrink-0 rounded-input border border-paper-line bg-paper px-4 py-3 sm:text-right">
            <p className="text-base font-bold text-ink-muted">
              {id.results.detail.score}
            </p>
            <p className="font-display text-3xl font-bold text-ink">
              {formatMessage(id.results.scoreValue, {
                score: detail.score,
                max: detail.maxScore,
              })}
            </p>
            <p className="text-base font-bold text-ink-muted">
              {formatMessage(id.results.percent, { percent })}
            </p>
            {detail.createdAt ? (
              <p className="text-base text-ink-muted">
                <time dateTime={detail.createdAt}>
                  {formatResultDate(detail.createdAt)}
                </time>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export function QuizAttemptDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const quizId = params.id ?? ''
  const attemptId = params.attemptId
  const enabled = Boolean(attemptId && user)

  const detailQuery = useQuery({
    queryKey: ['attempt-detail', attemptId, user?.id],
    queryFn: () => getAttemptDetail(attemptId as string),
    enabled,
  })

  if (detailQuery.isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          {id.results.detail.title}
        </h1>
        <Card>
          <Spinner label={id.common.loading} />
        </Card>
      </div>
    )
  }

  if (detailQuery.isError) {
    const errorCode =
      detailQuery.error instanceof QuizApiError
        ? detailQuery.error.code
        : 'unknown'

    if (errorCode === 'attempt_not_found' || errorCode === 'quiz_not_found') {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {id.results.detail.notFoundTitle}
          </h1>
          <Card className="space-y-3 border-dashed">
            <p className="max-w-prose text-base text-ink-muted">
              {id.results.detail.notFoundBody}
            </p>
            <Link
              to={`/quizzes/${quizId}/results`}
              className={buttonStyles('primary', 'md', 'w-fit')}
            >
              {id.results.detail.back}
            </Link>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          {id.results.detail.title}
        </h1>
        <ErrorState
          title={id.results.detail.loadErrorTitle}
          description={resultsErrorMessage(detailQuery.error)}
          onRetry={() => {
            void detailQuery.refetch()
          }}
          retryLabel={id.common.retry}
        />
        <Link
          to={`/quizzes/${quizId}/results`}
          className="inline-flex min-h-11 items-center rounded-input px-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.results.detail.back}
        </Link>
      </div>
    )
  }

  const detail = detailQuery.data
  const backQuizId = quizId || detail.quizId

  console.log('detail', detail)

  return (
    <div className="space-y-6">
      <DetailHeader detail={detail} quizId={backQuizId} />

      {detail.answers.length === 0 ? (
        <EmptyState
          title={id.results.detail.emptyTitle}
          description={id.results.detail.emptyBody}
        />
      ) : (
        <section aria-labelledby="answers-title" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2
              id="answers-title"
              className="text-2xl font-semibold text-ink"
            >
              {id.results.detail.answersTitle}
            </h2>
            <p className="text-base text-ink-muted">
              {id.results.detail.answersHint}
            </p>
          </div>

          <ol className="divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line bg-white">
            {detail.answers.map((answer, index) => (
              <AnswerCard
                key={answer.questionId}
                answer={answer}
                index={index}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
