import { useEffect, useRef, type FormEvent } from 'react'
import type { PlayerQuestion } from '@/api/player'
import { Button } from '@/components/ui/Button'
import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'
import { formatMessage } from '@/lib/message'
import { TimerBadge } from './TimerBadge'
import type { QuizAnswerValue } from './quiz-answers'

export type QuizQuestionViewProps = {
  quizTitle: string
  question: PlayerQuestion
  index: number
  total: number
  answer: QuizAnswerValue | undefined
  optionOrder: number[]
  timer: { remainingSeconds: number; totalSeconds: number } | null
  notice: string | null
  onAnswer: (value: QuizAnswerValue) => void
  onBack: () => void
  onNext: () => void
  onReview: (() => void) | null
  onRetry: () => void
  canGoBack: boolean
  isLast: boolean
  isSubmitting: boolean
  error: string | null
  submitError: string | null
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-5" aria-hidden="true" fill="none">
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function QuizQuestionView({
  quizTitle,
  question,
  index,
  total,
  answer,
  optionOrder,
  timer,
  notice,
  onAnswer,
  onBack,
  onNext,
  onReview,
  onRetry,
  canGoBack,
  isLast,
  isSubmitting,
  error,
  submitError,
}: QuizQuestionViewProps) {
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)
  const selectedOption = typeof answer === 'number' ? answer : undefined
  const textAnswer = typeof answer === 'string' ? answer : ''
  const questionHeadingId = `question-${question.id}-body`
  const singleLineInputId = `question-${question.id}-text`

  useEffect(() => {
    questionHeadingRef.current?.focus({ preventScroll: true })
  }, [question.id])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onNext()
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-[560px] flex-1 px-4 py-6">
        <div className="space-y-3">
          <p className="text-lg font-bold text-ink-muted">{quizTitle}</p>
          <p aria-live="polite" className="text-lg font-bold text-ink">
            {formatMessage(id.player.question.progress, {
              current: index + 1,
              total,
            })}
          </p>
          <div aria-hidden="true" className="grid grid-flow-col auto-cols-fr gap-1">
            {Array.from({ length: total }, (_, segmentIndex) => (
              <span
                key={segmentIndex}
                className={cn(
                  'h-2 rounded-pill',
                  segmentIndex < index
                    ? 'bg-green'
                    : segmentIndex === index
                      ? 'bg-blue'
                      : 'bg-paper-line',
                )}
              />
            ))}
          </div>
          {timer ? (
            <TimerBadge
              remainingSeconds={timer.remainingSeconds}
              totalSeconds={timer.totalSeconds}
            />
          ) : null}
          {notice ? (
            <p
              role="status"
              className="rounded-input border-2 border-yellow bg-yellow-tint px-3 py-2 text-lg font-bold text-ink"
            >
              {notice}
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex min-h-[calc(100dvh-9rem)] flex-col">
          <section aria-labelledby={questionHeadingId} className="space-y-5">
            <h1
              ref={questionHeadingRef}
              id={questionHeadingId}
              tabIndex={-1}
              className="max-w-[60ch] font-display text-2xl font-semibold leading-snug text-ink focus:outline-none sm:text-3xl"
            >
              {question.body}
            </h1>

            {question.type === 'multiple_choice' ? (
              <div className="space-y-3">
                <p className="text-lg text-ink-muted">{id.player.question.chooseHint}</p>
                <div
                  role="radiogroup"
                  aria-labelledby={questionHeadingId}
                  className="space-y-3"
                >
                  {optionOrder.map((originalIndex, displayIndex) => {
                    const option = question.options?.[originalIndex]
                    if (option === undefined) return null

                    const letter = optionLetter(displayIndex)
                    const isSelected = selectedOption === originalIndex

                    return (
                      <label
                        key={`${question.id}-${originalIndex}`}
                        className={cn(
                          'flex min-h-14 cursor-pointer items-center gap-3 rounded-card border-2 border-ink p-3 transition-colors focus-within:ring-[3px] focus-within:ring-blue focus-within:ring-offset-2 focus-within:ring-offset-paper',
                          isSelected ? 'bg-blue-tint' : 'bg-white hover:bg-blue-tint/40',
                          isSubmitting && 'cursor-not-allowed opacity-70',
                        )}
                      >
                        <input
                          type="radio"
                          name={`answer-${question.id}`}
                          value={originalIndex}
                          checked={isSelected}
                          onChange={() => onAnswer(originalIndex)}
                          disabled={isSubmitting}
                          aria-label={`${letter}. ${option}`}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-pill border-2 border-ink font-display text-lg font-semibold',
                            isSelected ? 'bg-ink text-white' : 'bg-white text-ink',
                          )}
                        >
                          {isSelected ? <CheckIcon /> : letter}
                        </span>
                        <span className="text-xl leading-snug text-ink">{option}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor={singleLineInputId}
                  className="block text-lg font-bold text-ink"
                >
                  {id.player.question.textLabel}
                </label>
                <input
                  id={singleLineInputId}
                  type="text"
                  value={textAnswer}
                  onChange={(event) => onAnswer(event.target.value)}
                  placeholder={id.player.question.textPlaceholder}
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoCorrect="off"
                  enterKeyHint="next"
                  spellCheck={false}
                  className="min-h-14 w-full rounded-input border-2 border-ink bg-white px-4 py-3 text-xl text-ink placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:bg-paper-line/30 disabled:text-ink-muted"
                />
              </div>
            )}
          </section>

          <div className="sticky bottom-0 -mx-4 mt-auto border-t border-paper-line bg-paper/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
            <div className="mx-auto w-full max-w-[560px] space-y-3">
              {error ? (
                <p role="alert" className="text-lg font-bold text-coral">
                  {error}
                </p>
              ) : null}

              {submitError ? (
                <div
                  role="alert"
                  className="space-y-2 rounded-input border-2 border-coral bg-coral-tint p-3"
                >
                  <p className="text-lg font-bold text-coral">
                    {id.player.question.submitErrorTitle}
                  </p>
                  <p className="text-lg text-ink">{submitError}</p>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={onRetry}
                    disabled={isSubmitting}
                  >
                    {id.player.question.retry}
                  </Button>
                </div>
              ) : null}

              {onReview && !submitError ? (
                <Button
                  variant="secondary"
                  size="lg"
                  type="button"
                  onClick={onReview}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {id.player.question.review}
                </Button>
              ) : null}

              <div className="flex gap-2">
                {index > 0 && canGoBack ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    type="button"
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="shrink-0"
                  >
                    {id.player.question.back}
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting
                    ? id.player.question.submitting
                    : isLast
                      ? id.player.question.submit
                      : id.player.question.next}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
