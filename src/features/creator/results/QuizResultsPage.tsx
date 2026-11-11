import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getQuizResults,
  getQuizStats,
  type QuizAttemptSummary,
  type QuizQuestionStat,
  type QuizResultsQuiz,
} from '@/api/results'
import { QuizApiError } from '@/api/quiz-errors'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-context'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'
import { formatResultDate, percentOf } from './results-format'
import { resultsErrorMessage } from './results-error-message'

function getResultStats(attempts: QuizAttemptSummary[]) {
  const percents = attempts.map((attempt) =>
    percentOf(attempt.score, attempt.maxScore),
  )
  const average = Math.round(
    percents.reduce((total, percent) => total + percent, 0) / percents.length,
  )

  return {
    average,
    highest: Math.max(...percents),
  }
}

function ResultsHeader({
  quiz,
  copied,
  onCopy,
}: {
  quiz: QuizResultsQuiz
  copied: boolean
  onCopy: () => void
}) {
  const isPublished = quiz.status === 'published'

  return (
    <section className="relative overflow-hidden rounded-card border border-paper-line bg-white p-6">
      <div
        aria-hidden="true"
        className="notebook-lines pointer-events-none absolute inset-x-0 top-0 h-28 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <div className="relative space-y-5">
        <Link
          to="/dashboard"
          className="inline-flex min-h-11 items-center rounded-input px-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.results.backToDashboard}
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Chip variant={quiz.status} className="text-base" />
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {id.results.title}
            </h1>
            <p className="text-xl font-semibold text-ink">{quiz.title}</p>
            <p className="max-w-prose text-base text-ink-muted">
              {id.results.subtitle}
            </p>
          </div>

          <div className="shrink-0 space-y-2 sm:text-right">
            <p className="text-base font-bold text-ink-muted">
              {id.results.codeLabel}
            </p>
            <p className="w-fit rounded-input border border-paper-line bg-paper px-3 py-1.5 font-display text-lg font-semibold tracking-[0.2em] text-ink sm:ml-auto">
              {quiz.shareCode}
            </p>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              {isPublished ? (
                <>
                  <Button variant="secondary" onClick={onCopy}>
                    {copied ? id.results.copied : id.results.copyLink}
                  </Button>
                  <span className="sr-only" role="status">
                    {copied ? id.results.copied : ''}
                  </span>
                  <Link
                    to={`/play/${quiz.shareCode}`}
                    className={buttonStyles('ghost', 'md', 'shrink-0')}
                  >
                    {id.results.openPlayer}
                  </Link>
                </>
              ) : (
                <Link
                  to={`/quizzes/${quiz.id}/edit`}
                  className={buttonStyles('secondary', 'md', 'shrink-0')}
                >
                  {id.results.editQuiz}
                </Link>
              )}
            </div>

            {!isPublished ? (
              <p className="text-base text-ink-muted sm:max-w-[240px]">
                {id.dashboard.draftShareHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function QuestionStatsSection({
  stats,
  isPending,
  isError,
  onRetry,
}: {
  stats: QuizQuestionStat[] | null
  isPending: boolean
  isError: boolean
  onRetry: () => void
}) {
  return (
    <section aria-labelledby="question-stats-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2
          id="question-stats-title"
          className="text-2xl font-semibold text-ink"
        >
          {id.results.stats.title}
        </h2>
        <p className="text-base text-ink-muted">{id.results.stats.hint}</p>
      </div>

      {isPending ? (
        <Card>
          <Spinner label={id.results.stats.loading} />
        </Card>
      ) : isError ? (
        <ErrorState
          description={id.results.stats.error}
          onRetry={onRetry}
          retryLabel={id.common.retry}
        />
      ) : !stats || stats.length === 0 ? (
        <Card className="border-dashed">
          <p className="text-base text-ink-muted">
            {id.results.stats.noAnswers}
          </p>
        </Card>
      ) : (
        <ol className="divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line bg-white">
          {stats.map((stat) => (
            <li key={stat.questionId} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words text-lg font-semibold text-ink">
                  {stat.body}
                </p>
                <p className="shrink-0 font-display text-2xl font-bold text-ink">
                  {formatMessage(id.results.percent, {
                    percent: stat.correctRate,
                  })}
                </p>
              </div>
              <p className="text-base text-ink-muted">
                {stat.answeredCount > 0
                  ? formatMessage(id.results.stats.correctOf, {
                      correct: stat.correctCount,
                      total: stat.answeredCount,
                    })
                  : id.results.stats.noAnswers}
              </p>
              <div
                aria-hidden="true"
                className="mt-2 h-2 overflow-hidden rounded-pill bg-paper-line"
              >
                <div
                  className="h-full rounded-pill bg-green"
                  style={{ width: `${stat.correctRate}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function AttemptList({
  quizId,
  attempts,
}: {
  quizId: string
  attempts: QuizAttemptSummary[]
}) {
  return (
    <section aria-labelledby="attempts-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="attempts-title" className="text-2xl font-semibold text-ink">
          {id.results.listTitle}
        </h2>
        <p className="text-base text-ink-muted">{id.results.listHint}</p>
      </div>

      <ol className="divide-y divide-paper-line overflow-hidden rounded-card border border-paper-line bg-white">
        {attempts.map((attempt) => {
          const percent = percentOf(attempt.score, attempt.maxScore)
          const nameId = `attempt-${attempt.id}-name`

          return (
            <li key={attempt.id}>
              <Link
                to={`/quizzes/${quizId}/results/${attempt.id}`}
                className="block p-5 transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
              >
                <article aria-labelledby={nameId} className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        id={nameId}
                        className="break-words text-xl font-semibold text-ink"
                      >
                        {attempt.participantName}
                      </h3>
                      <p className="text-base text-ink-muted">
                        <time dateTime={attempt.createdAt}>
                          {formatResultDate(attempt.createdAt)}
                        </time>
                      </p>
                    </div>

                    <div className="shrink-0 rounded-input border border-paper-line bg-paper px-3 py-2 text-right">
                      <p className="font-display text-2xl font-bold text-ink">
                        {formatMessage(id.results.scoreValue, {
                          score: attempt.score,
                          max: attempt.maxScore,
                        })}
                      </p>
                      <p className="text-base font-bold text-ink-muted">
                        {formatMessage(id.results.percent, { percent })}
                      </p>
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    className="h-2 overflow-hidden rounded-pill bg-paper-line"
                  >
                    <div
                      className="h-full rounded-pill bg-blue"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="text-base font-bold text-blue">
                    {id.results.detail.view}
                  </p>
                </article>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function QuizResultsPage() {
  const params = useParams()
  const { user } = useAuth()
  const quizId = params.id
  const ownerId = user?.id
  const [copied, setCopied] = useState(false)

  const resultsQuery = useQuery({
    queryKey: ['quiz-results', quizId, ownerId],
    queryFn: () => getQuizResults(quizId as string, ownerId as string),
    enabled: Boolean(quizId && ownerId),
  })

  const statsQuery = useQuery({
    queryKey: ['quiz-stats', quizId, ownerId],
    queryFn: () => getQuizStats(quizId as string),
    enabled:
      Boolean(quizId && ownerId) &&
      (resultsQuery.data?.attempts.length ?? 0) > 0,
  })

  if (resultsQuery.isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          {id.results.title}
        </h1>
        <Card>
          <Spinner label={id.common.loading} />
        </Card>
      </div>
    )
  }

  if (resultsQuery.isError) {
    const errorCode =
      resultsQuery.error instanceof QuizApiError
        ? resultsQuery.error.code
        : 'unknown'

    if (errorCode === 'quiz_not_found') {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {id.results.notFoundTitle}
          </h1>
          <Card className="space-y-3 border-dashed">
            <p className="max-w-prose text-base text-ink-muted">
              {id.results.notFoundBody}
            </p>
            <Link
              to="/dashboard"
              className={buttonStyles('primary', 'md', 'w-fit')}
            >
              {id.results.notFoundAction}
            </Link>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          {id.results.title}
        </h1>
        <ErrorState
          title={id.results.loadErrorTitle}
          description={resultsErrorMessage(resultsQuery.error)}
          onRetry={() => {
            void resultsQuery.refetch()
          }}
          retryLabel={id.common.retry}
        />
        <Link
          to="/dashboard"
          className="inline-flex min-h-11 items-center rounded-input px-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.results.backToDashboard}
        </Link>
      </div>
    )
  }

  const { quiz, attempts } = resultsQuery.data
  const stats = attempts.length > 0 ? getResultStats(attempts) : null

  const handleCopy = async () => {
    const shareUrl = `${window.location.origin}/play/${quiz.shareCode}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      <ResultsHeader
        quiz={quiz}
        copied={copied}
        onCopy={() => {
          void handleCopy()
        }}
      />

      {attempts.length === 0 ? (
        <EmptyState
          title={
            quiz.status === 'draft'
              ? id.results.emptyDraftTitle
              : id.results.emptyPublishedTitle
          }
          description={
            quiz.status === 'draft'
              ? id.results.emptyDraftBody
              : formatMessage(id.results.emptyPublishedBody, {
                  code: quiz.shareCode,
                })
          }
        />
      ) : (
        <>
          <dl
            aria-label={id.results.summaryLabel}
            className="grid gap-4 sm:grid-cols-3"
          >
            <div className="rounded-card border border-paper-line bg-white p-5">
              <dt className="text-base font-bold text-ink-muted">
                {id.results.summary.attempts}
              </dt>
              <dd className="mt-1 font-display text-3xl font-bold text-ink">
                {attempts.length}
              </dd>
            </div>
            <div className="rounded-card border border-paper-line bg-white p-5">
              <dt className="text-base font-bold text-ink-muted">
                {id.results.summary.average}
              </dt>
              <dd className="mt-1 font-display text-3xl font-bold text-ink">
                {formatMessage(id.results.percent, {
                  percent: stats?.average ?? 0,
                })}
              </dd>
            </div>
            <div className="rounded-card border border-paper-line bg-white p-5">
              <dt className="text-base font-bold text-ink-muted">
                {id.results.summary.highest}
              </dt>
              <dd className="mt-1 font-display text-3xl font-bold text-ink">
                {formatMessage(id.results.percent, {
                  percent: stats?.highest ?? 0,
                })}
              </dd>
            </div>
          </dl>

          <QuestionStatsSection
            stats={statsQuery.data?.questionStats ?? null}
            isPending={statsQuery.isPending}
            isError={statsQuery.isError}
            onRetry={() => {
              void statsQuery.refetch()
            }}
          />

          <AttemptList quizId={quiz.id} attempts={attempts} />
        </>
      )}
    </div>
  )
}
