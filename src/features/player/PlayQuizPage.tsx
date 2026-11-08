import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getQuizByCode } from '@/api/player'
import { PlayerApiError } from '@/api/player-errors'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { id } from '@/i18n/id'
import { normalizeQuizCode, QUIZ_CODE_LENGTH } from '@/lib/quiz-code'
import { PlayerHeader } from './PlayerHeader'
import { playerErrorMessage } from './player-error-message'
import { QuizRunner } from './QuizRunner'

function PlayerMessage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-6">
      <PlayerHeader />
      <Card className="space-y-4 border-dashed text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted">{description}</p>
        <Link
          to="/"
          className={buttonStyles('primary', 'lg', 'w-full')}
        >
          {id.player.tryAnotherCode}
        </Link>
      </Card>
    </main>
  )
}

export function PlayQuizPage() {
  const params = useParams()
  const code = normalizeQuizCode(params.code ?? '')

  const quizQuery = useQuery({
    queryKey: ['player-quiz', code],
    queryFn: () => getQuizByCode(code),
    enabled: code.length === QUIZ_CODE_LENGTH,
    retry: (failureCount, error) =>
      error instanceof PlayerApiError &&
      (error.code === 'network' || error.code === 'load_failed') &&
      failureCount < 1,
  })

  if (code.length < QUIZ_CODE_LENGTH) {
    return (
      <PlayerMessage
        title={id.player.notFoundTitle}
        description={id.player.notFoundBody}
      />
    )
  }

  if (quizQuery.isPending) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-4 py-6">
        <PlayerHeader />
        <Card role="status" className="flex items-center gap-3">
          <span
            aria-hidden
            className="size-6 shrink-0 animate-spin rounded-full border-[3px] border-paper-line border-t-blue"
          />
          <p className="text-lg font-bold text-ink-muted">{id.player.loading}</p>
        </Card>
      </main>
    )
  }

  if (quizQuery.isError) {
    const errorCode =
      quizQuery.error instanceof PlayerApiError ? quizQuery.error.code : 'unknown'

    if (errorCode === 'quiz_not_found') {
      return (
        <PlayerMessage
          title={id.player.notFoundTitle}
          description={id.player.notFoundBody}
        />
      )
    }

    if (errorCode === 'quiz_not_published') {
      return (
        <PlayerMessage
          title={id.player.notPublishedTitle}
          description={id.player.notPublishedBody}
        />
      )
    }

    if (errorCode === 'invalid_quiz') {
      return (
        <PlayerMessage
          title={id.player.invalidTitle}
          description={id.player.invalidBody}
        />
      )
    }

    return (
      <main className="mx-auto w-full max-w-[560px] px-4 py-6">
        <PlayerHeader />
        <Card className="space-y-4 border-coral-tint bg-coral-tint/40" role="alert">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink">
            {id.player.loadErrorTitle}
          </h1>
          <p className="text-lg leading-relaxed text-ink-muted">
            {playerErrorMessage(quizQuery.error)}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => {
              void quizQuery.refetch()
            }}
          >
            {id.common.retry}
          </Button>
        </Card>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-input px-2 text-lg font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.player.home}
        </Link>
      </main>
    )
  }

  return <QuizRunner key={`${quizQuery.data.id}-${code}`} quiz={quizQuery.data} code={code} />
}
