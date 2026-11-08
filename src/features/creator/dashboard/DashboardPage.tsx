import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteQuiz,
  listCreatorQuizzes,
  type CreatorQuizSummary,
} from '@/api/quizzes'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-context'
import { quizErrorMessage } from '@/features/creator/quiz/quiz-error-message'
import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'

type QuizFilter = 'all' | 'draft' | 'published'

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

export function DashboardPage() {
  const { user } = useAuth()
  const ownerId = user?.id
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<QuizFilter>('all')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletedTitle, setDeletedTitle] = useState<string | null>(null)

  const quizzesQuery = useQuery({
    queryKey: ['quizzes', ownerId],
    queryFn: () => listCreatorQuizzes(ownerId as string),
    enabled: Boolean(ownerId),
  })

  const deleteMutation = useMutation({
    mutationFn: (quiz: CreatorQuizSummary) =>
      deleteQuiz(quiz.id, ownerId as string),
    onSuccess: (_, quiz) => {
      setConfirmingId(null)
      setDeletedTitle(quiz.title)
      queryClient.setQueryData<CreatorQuizSummary[]>(
        ['quizzes', ownerId],
        (current) => current?.filter((item) => item.id !== quiz.id),
      )
      void queryClient.invalidateQueries({ queryKey: ['quizzes', ownerId] })
    },
  })

  const quizzes = quizzesQuery.data ?? []
  const counts: Record<QuizFilter, number> = {
    all: quizzes.length,
    draft: quizzes.filter((quiz) => quiz.status === 'draft').length,
    published: quizzes.filter((quiz) => quiz.status === 'published').length,
  }
  const filteredQuizzes =
    filter === 'all' ? quizzes : quizzes.filter((quiz) => quiz.status === filter)

  const handleCopyLink = async (quiz: CreatorQuizSummary) => {
    const shareUrl = `${window.location.origin}/play/${quiz.share_code}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedId(quiz.id)
    } catch {
      setCopiedId(null)
    }
  }

  const handleFilter = (nextFilter: QuizFilter) => {
    setFilter(nextFilter)
    setConfirmingId(null)
    deleteMutation.reset()
  }

  const filters: Array<{ value: QuizFilter; label: string }> = [
    { value: 'all', label: id.dashboard.filterAll },
    { value: 'draft', label: id.dashboard.filterDraft },
    { value: 'published', label: id.dashboard.filterPublished },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {id.dashboard.title}
          </h1>
          <p className="max-w-prose text-base text-ink-muted">{id.dashboard.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/quizzes/ai"
            className={buttonStyles('secondary', 'lg', 'shrink-0')}
          >
            {id.dashboard.createWithAi}
          </Link>
          <Link
            to="/quizzes/new"
            className={buttonStyles('primary', 'lg', 'shrink-0')}
          >
            {id.dashboard.create}
          </Link>
        </div>
      </div>

      {deletedTitle ? (
        <p
          role="status"
          className="rounded-input border border-green bg-green-tint px-4 py-3 text-sm font-bold text-green"
        >
          {id.dashboard.deleted}
        </p>
      ) : null}

      {quizzesQuery.isPending ? (
        <Card>
          <Spinner label={id.common.loading} />
        </Card>
      ) : null}

      {quizzesQuery.isError ? (
        <ErrorState
          title={id.dashboard.loadErrorTitle}
          description={quizErrorMessage(quizzesQuery.error)}
          onRetry={() => {
            void quizzesQuery.refetch()
          }}
          retryLabel={id.dashboard.loadRetry}
        />
      ) : null}

      {!quizzesQuery.isPending && !quizzesQuery.isError ? (
        quizzes.length === 0 ? (
          <EmptyState
            title={id.dashboard.emptyTitle}
            description={id.dashboard.emptyDescription}
            action={
              <Link to="/quizzes/new" className={buttonStyles('primary')}>
                {id.dashboard.create}
              </Link>
            }
          />
        ) : (
          <>
            <div
              role="group"
              aria-label={id.dashboard.filterLabel}
              className="flex flex-wrap gap-2"
            >
              {filters.map((item) => {
                const isActive = filter === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleFilter(item.value)}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-2 rounded-pill border-2 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                      isActive
                        ? 'border-ink bg-blue text-white'
                        : 'border-ink bg-white text-ink hover:bg-blue-tint',
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        'rounded-pill px-2 py-0.5 text-xs',
                        isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-muted',
                      )}
                    >
                      {counts[item.value]}
                    </span>
                  </button>
                )
              })}
            </div>

            {filteredQuizzes.length === 0 ? (
              <EmptyState
                title={
                  filter === 'published'
                    ? id.dashboard.emptyPublishedTitle
                    : id.dashboard.emptyDraftTitle
                }
                description={
                  filter === 'published'
                    ? id.dashboard.emptyPublishedDescription
                    : id.dashboard.emptyDraftDescription
                }
                action={
                  <Button variant="secondary" onClick={() => handleFilter('all')}>
                    {id.dashboard.viewAll}
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-4">
                {filteredQuizzes.map((quiz) => {
                  const isPublished = quiz.status === 'published'
                  const isConfirming = confirmingId === quiz.id
                  const isDeleting =
                    deleteMutation.isPending &&
                    deleteMutation.variables?.id === quiz.id
                  const showDeleteError =
                    isConfirming &&
                    deleteMutation.isError &&
                    deleteMutation.variables?.id === quiz.id

                  return (
                    <li key={quiz.id}>
                      <article
                        aria-labelledby={`quiz-${quiz.id}-title`}
                        className="rounded-card border border-paper-line bg-white p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Chip variant={quiz.status} />
                              {quiz.source === 'ai' ? <Chip variant="ai" /> : null}
                            </div>

                            <h2
                              id={`quiz-${quiz.id}-title`}
                              className="text-2xl font-semibold text-ink"
                            >
                              <Link
                                to={`/quizzes/${quiz.id}/edit`}
                                className="rounded-input underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
                              >
                                {quiz.title}
                              </Link>
                            </h2>

                            {quiz.description ? (
                              <p className="line-clamp-2 max-w-prose text-base leading-relaxed text-ink-muted">
                                {quiz.description}
                              </p>
                            ) : null}

                            <p className="text-sm text-ink-muted">
                              {id.dashboard.updatedAt} {formatDate(quiz.updated_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Link
                              to={`/quizzes/${quiz.id}/edit`}
                              aria-label={`${id.dashboard.edit}: ${quiz.title}`}
                              className={buttonStyles('secondary', 'md', 'shrink-0')}
                            >
                              {id.dashboard.edit}
                            </Link>
                            <Link
                              to={`/quizzes/${quiz.id}/results`}
                              aria-label={`${id.dashboard.results}: ${quiz.title}`}
                              className={buttonStyles('ghost', 'md', 'shrink-0')}
                            >
                              {id.dashboard.results}
                            </Link>
                            {!isConfirming ? (
                              <Button
                                variant="dangerGhost"
                                aria-label={`${id.dashboard.delete}: ${quiz.title}`}
                                onClick={() => {
                                  deleteMutation.reset()
                                  setConfirmingId(quiz.id)
                                }}
                              >
                                {id.dashboard.delete}
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-paper-line pt-4">
                          <span className="text-sm font-bold text-ink">
                            {id.dashboard.codeLabel}
                          </span>
                          <span className="rounded-input border border-paper-line bg-paper px-3 py-1.5 font-display text-lg font-semibold tracking-[0.2em] text-ink">
                            {quiz.share_code}
                          </span>

                          {isPublished ? (
                            <>
                              <Button
                                variant="ghost"
                                aria-label={`${id.dashboard.copyLink}: ${quiz.title}`}
                                onClick={() => {
                                  void handleCopyLink(quiz)
                                }}
                              >
                                {copiedId === quiz.id
                                  ? id.dashboard.copied
                                  : id.dashboard.copyLink}
                              </Button>
                              <Link
                                to={`/play/${quiz.share_code}`}
                                aria-label={`${id.dashboard.open}: ${quiz.title}`}
                                className="inline-flex min-h-11 items-center rounded-input px-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
                              >
                                {id.dashboard.open}
                              </Link>
                            </>
                          ) : (
                            <p className="text-sm text-ink-muted">
                              {id.dashboard.draftShareHint}
                            </p>
                          )}
                        </div>

                        {isConfirming ? (
                          <div
                            role="alertdialog"
                            aria-labelledby={`delete-${quiz.id}-title`}
                            className="mt-4 space-y-3 rounded-input border-2 border-coral bg-coral-tint/40 p-4"
                          >
                            <h3
                              id={`delete-${quiz.id}-title`}
                              className="text-base font-bold text-ink"
                            >
                              {id.dashboard.deleteConfirmTitle}
                            </h3>
                            <p className="text-sm text-ink-muted">
                              {id.dashboard.deleteConfirmBody}
                            </p>

                            {showDeleteError ? (
                              <p role="alert" className="text-sm font-bold text-coral">
                                {quizErrorMessage(deleteMutation.error)}
                              </p>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="danger"
                                disabled={isDeleting}
                                onClick={() => deleteMutation.mutate(quiz)}
                              >
                                {isDeleting
                                  ? id.dashboard.deleting
                                  : id.dashboard.deleteConfirm}
                              </Button>
                              <Button
                                variant="secondary"
                                autoFocus
                                disabled={isDeleting}
                                onClick={() => {
                                  setConfirmingId(null)
                                  deleteMutation.reset()
                                }}
                              >
                                {id.dashboard.deleteCancel}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )
      ) : null}
    </div>
  )
}
