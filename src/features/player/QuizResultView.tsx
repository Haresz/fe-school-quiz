import { Link } from 'react-router-dom'
import type { PlayerQuiz, PlayerReview } from '@/api/player'
import { Button } from '@/components/ui/Button'
import { buttonStyles } from '@/components/ui/button-styles'
import { Card } from '@/components/ui/Card'
import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'
import { formatMessage } from '@/lib/message'
import { getResultSummary } from './player-result'
import type { QuizAnswerValue } from './QuizQuestionView'

export type QuizResultViewProps = {
  quiz: PlayerQuiz
  participantName: string
  answers: Record<string, QuizAnswerValue>
  result: {
    score: number
    maxScore: number
    reviews: PlayerReview[]
  }
  onAgain: () => void
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

function formatOption(question: PlayerQuiz['questions'][number], index: number) {
  const option = question.options?.[index]
  if (option === undefined) return null
  return `${optionLetter(index)}. ${option}`
}

function formatUserAnswer(
  question: PlayerQuiz['questions'][number],
  answer: QuizAnswerValue | undefined,
): string {
  if (typeof answer === 'number') {
    return formatOption(question, answer) ?? id.player.result.noAnswer
  }

  if (typeof answer === 'string' && answer.trim()) {
    return answer.trim()
  }

  return id.player.result.noAnswer
}

function getCorrectAnswer(
  question: PlayerQuiz['questions'][number],
  review: PlayerReview | undefined,
): string | null {
  if (!review) return null
  if (review.correctAnswer) return review.correctAnswer
  if (review.correctIndex !== null) return formatOption(question, review.correctIndex)
  return null
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-8', filled ? 'text-yellow' : 'text-paper-line')}
      aria-hidden="true"
      fill="currentColor"
      stroke="var(--color-ink)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="m12 2.8 2.8 5.7 6.3.9-4.5 4.4 1.1 6.3-5.7-3-5.7 3 1.1-6.3L3 9.4l6.2-.9L12 2.8Z" />
    </svg>
  )
}

function StatusIcon({ correct }: { correct: boolean }) {
  if (correct) {
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

  return (
    <svg viewBox="0 0 16 16" className="size-5" aria-hidden="true" fill="none">
      <path
        d="m4 4 8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function QuizResultView({
  quiz,
  participantName,
  answers,
  result,
  onAgain,
}: QuizResultViewProps) {
  const summary = getResultSummary(result.score, result.maxScore)
  const reviewsByQuestion = new Map(
    result.reviews.map((review) => [review.questionId, review]),
  )
  const reviewedQuestions = quiz.questions.filter((question) =>
    reviewsByQuestion.has(question.id),
  )
  const showReview = quiz.revealAnswers && reviewedQuestions.length > 0

  return (
    <div className="space-y-8 py-6">
      <section className="space-y-5 text-center">
        <div className="result-stamp mx-auto w-fit max-w-full rounded-[22px] border-[3px] border-ink bg-yellow-tint px-8 py-6">
          <div
            className="flex justify-center gap-1"
            role="img"
            aria-label={formatMessage(id.player.result.stars, {
              count: summary.stars,
            })}
          >
            {[0, 1, 2].map((star) => (
              <StarIcon key={star} filled={star < summary.stars} />
            ))}
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink">
            {summary.message}
          </h1>
          <p className="mt-1 text-2xl font-bold text-ink">
            {formatMessage(id.player.result.scoreWords, {
              score: result.score,
              max: result.maxScore,
            })}
          </p>
          <p className="text-lg font-bold text-ink-muted">
            {formatMessage(id.player.result.percent, { percent: summary.percent })}
          </p>
        </div>

        <p className="text-2xl font-semibold text-ink">
          {formatMessage(id.player.result.greeting, { name: participantName })}
        </p>
      </section>

      {showReview ? (
        <section
          aria-labelledby="review-title"
          className="mx-auto w-full max-w-[560px] space-y-4"
        >
          <h2 id="review-title" className="text-2xl font-semibold text-ink">
            {id.player.result.reviewTitle}
          </h2>

          <ol className="space-y-3">
            {quiz.questions.map((question, questionIndex) => {
              const review = reviewsByQuestion.get(question.id)
              if (!review) return null
              const correct = review.isCorrect
              const correctAnswer = getCorrectAnswer(question, review)

              return (
                <li key={question.id}>
                  <Card className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-lg font-bold',
                          correct
                            ? 'bg-green-tint text-green'
                            : 'bg-coral-tint text-coral',
                        )}
                      >
                        <StatusIcon correct={correct} />
                        {correct ? id.player.result.correct : id.player.result.incorrect}
                      </span>
                      <span className="text-lg font-bold text-ink-muted">
                        {formatMessage(id.player.result.questionNumber, {
                          number: questionIndex + 1,
                        })}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold leading-snug text-ink">
                      {question.body}
                    </h3>

                    <div className="space-y-1">
                      <p className="text-lg font-bold text-ink-muted">
                        {id.player.result.yourAnswer}
                      </p>
                      <p className="text-lg text-ink">
                        {formatUserAnswer(question, answers[question.id])}
                      </p>
                    </div>

                    {!correct && correctAnswer ? (
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-green">
                          {id.player.result.correctAnswer}
                        </p>
                        <p className="text-lg text-ink">{correctAnswer}</p>
                      </div>
                    ) : null}

                    {review?.explanation ? (
                      <div className="space-y-1 border-t border-paper-line pt-3">
                        <p className="text-lg font-bold text-ink">
                          {id.player.result.explanation}
                        </p>
                        <p className="text-lg leading-relaxed text-ink-muted">
                          {review.explanation}
                        </p>
                      </div>
                    ) : null}
                  </Card>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={onAgain} className="flex-1">
          {id.player.result.again}
        </Button>
        <Link to="/" className={buttonStyles('secondary', 'lg', 'flex-1')}>
          {id.player.result.home}
        </Link>
      </div>
    </div>
  )
}
