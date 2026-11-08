import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getQuizResults,
  type QuizAttemptSummary,
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
import { resultsErrorMessage } from './results-error-message'

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

function percentOf(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)))
}

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

function AttemptList({ attempts }: { attempts: QuizAttemptSummary[] }) {
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
            <li key={attempt.id} className="p-5">
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
                        {formatDate(attempt.createdAt)}
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
              </article>
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

          <AttemptList attempts={attempts} />
        </>
      )}
    </div>
  )
}
