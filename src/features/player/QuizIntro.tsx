import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'
import type { PlayerQuiz } from '@/api/player'

export type QuizIntroProps = {
  quiz: PlayerQuiz
  onStart: (participantName: string) => void
}

export function QuizIntro({ quiz, onStart }: QuizIntroProps) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const [participantName, setParticipantName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const totalPoints = quiz.questions.reduce(
    (total, question) => total + question.points,
    0,
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = participantName.trim()

    if (!name) {
      setError(id.player.intro.nameRequired)
      return
    }

    onStart(name)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {quiz.title}
        </h1>
        {quiz.description ? (
          <p className="max-w-prose text-xl leading-relaxed text-ink-muted">
            {quiz.description}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-pill border border-paper-line bg-white px-3 py-1 text-lg font-bold text-ink">
            {formatMessage(id.player.intro.questionCount, {
              count: quiz.questions.length,
            })}
          </span>
          <span className="rounded-pill border border-paper-line bg-white px-3 py-1 text-lg font-bold text-ink">
            {formatMessage(id.player.intro.pointsCount, { points: totalPoints })}
          </span>
        </div>
      </header>

      <Card className="space-y-5 border-ink">
        <h2 className="text-2xl font-semibold text-ink">
          {id.player.intro.formTitle}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={inputId} className="block text-lg font-bold text-ink">
              {id.player.intro.nameLabel}
            </label>
            <input
              id={inputId}
              type="text"
              value={participantName}
              onChange={(event) => {
                setParticipantName(event.target.value)
                if (error) setError(null)
              }}
              placeholder={id.player.intro.namePlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={[hintId, error ? errorId : ''].filter(Boolean).join(' ')}
              autoComplete="off"
              autoFocus
              enterKeyHint="go"
              maxLength={40}
              className="min-h-14 w-full rounded-input border-2 border-ink bg-white px-4 py-3 text-xl text-ink placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            />
            <p id={hintId} className="text-lg text-ink-muted">
              {id.player.intro.nameHint}
            </p>
            {error ? (
              <p id={errorId} role="alert" className="text-lg font-bold text-coral">
                {error}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" className="w-full">
            {id.player.intro.start}
          </Button>
        </form>
      </Card>

      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-input px-2 text-lg font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {id.player.tryAnotherCode}
      </Link>
    </div>
  )
}
