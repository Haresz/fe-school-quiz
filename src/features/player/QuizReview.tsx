import type { PlayerQuestion } from '@/api/player'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'
import { formatMessage } from '@/lib/message'
import { TimerBadge } from './TimerBadge'
import type { QuizAnswerValue } from './quiz-answers'
import { isAnswered } from './quiz-answers'

export type QuizReviewProps = {
  quizTitle: string
  questions: PlayerQuestion[]
  optionOrders: Record<string, number[]>
  answers: Record<string, QuizAnswerValue>
  timer: { remainingSeconds: number; totalSeconds: number } | null
  onEditQuestion: (index: number) => void
  onSubmit: () => void
  onBack: () => void
  onRetry: () => void
  isSubmitting: boolean
  submitError: string | null
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

function answerLabel(
  question: PlayerQuestion,
  answer: QuizAnswerValue | undefined,
  optionOrder: number[] | undefined,
): string {
  if (typeof answer === 'number') {
    const option = question.options?.[answer]
    if (option === undefined) return id.player.result.noAnswer
    const displayIndex = optionOrder ? optionOrder.indexOf(answer) : answer
    const letterIndex = displayIndex >= 0 ? displayIndex : answer
    return `${optionLetter(letterIndex)}. ${option}`
  }

  if (typeof answer === 'string' && answer.trim()) {
    return answer.trim()
  }

  return id.player.result.noAnswer
}

export function QuizReview({
  quizTitle,
  questions,
  optionOrders,
  answers,
  timer,
  onEditQuestion,
  onSubmit,
  onBack,
  onRetry,
  isSubmitting,
  submitError,
}: QuizReviewProps) {
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-[560px] flex-1 px-4 py-6">
        <div className="space-y-3">
          <p className="text-lg font-bold text-ink-muted">{quizTitle}</p>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {id.player.review.title}
          </h1>
          <p className="text-lg text-ink-muted">{id.player.review.hint}</p>
          {timer ? (
            <TimerBadge
              remainingSeconds={timer.remainingSeconds}
              totalSeconds={timer.totalSeconds}
            />
          ) : null}
        </div>

        <ol className="mt-6 space-y-3">
          {questions.map((question, index) => {
            const answered = isAnswered(question, answers[question.id])

            return (
              <li key={question.id}>
                <Card className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-lg font-bold text-ink-muted">
                      {formatMessage(id.player.result.questionNumber, {
                        number: index + 1,
                      })}
                    </span>
                    <span
                      className={cn(
                        'rounded-pill px-3 py-1 text-base font-bold',
                        answered
                          ? 'bg-green-tint text-green'
                          : 'bg-yellow-tint text-ink',
                      )}
                    >
                      {answered
                        ? id.player.review.answered
                        : id.player.result.noAnswer}
                    </span>
                  </div>

                  <p className="text-lg leading-snug text-ink">{question.body}</p>

                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-ink-muted">
                        {id.player.result.yourAnswer}
                      </p>
                      <p className="text-lg text-ink">
                        {answerLabel(
                          question,
                          answers[question.id],
                          optionOrders[question.id],
                        )}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => onEditQuestion(index)}
                      disabled={isSubmitting}
                    >
                      {id.player.review.edit}
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="sticky bottom-0 border-t border-paper-line bg-paper/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[560px] space-y-3">
          {submitError ? (
            <div
              role="alert"
              className="space-y-2 rounded-input border-2 border-coral bg-coral-tint p-3"
            >
              <p className="text-lg font-bold text-coral">
                {id.player.question.submitErrorTitle}
              </p>
              <p className="text-lg text-ink">{submitError}</p>
              <Button variant="secondary" type="button" onClick={onRetry}>
                {id.player.question.retry}
              </Button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="shrink-0"
            >
              {id.player.review.back}
            </Button>
            <Button
              size="lg"
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting
                ? id.player.review.submitting
                : id.player.review.submit}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
