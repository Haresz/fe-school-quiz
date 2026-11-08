import { useEffect, useState } from 'react'
import {
  submitAttempt,
  type PlayerQuiz,
  type PlayerQuestion,
  type PlayerAttemptResult,
} from '@/api/player'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'
import { PlayerHeader } from './PlayerHeader'
import { playerErrorMessage } from './player-error-message'
import { QuizIntro } from './QuizIntro'
import {
  QuizQuestionView,
  type QuizAnswerValue,
} from './QuizQuestionView'
import { QuizResultView } from './QuizResultView'

type PlayerScreen = 'intro' | 'playing' | 'result'

function isAnswered(
  question: PlayerQuestion,
  answer: QuizAnswerValue | undefined,
): boolean {
  if (typeof answer === 'number') {
    return answer >= 0 && answer < (question.options?.length ?? 0)
  }

  return typeof answer === 'string' && answer.trim().length > 0
}

export function QuizRunner({ quiz, code }: { quiz: PlayerQuiz; code: string }) {
  const [screen, setScreen] = useState<PlayerScreen>('intro')
  const [participantName, setParticipantName] = useState('')
  const [answers, setAnswers] = useState<Record<string, QuizAnswerValue>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<PlayerAttemptResult | null>(null)

  const totalPoints = quiz.questions.reduce(
    (total, question) => total + question.points,
    0,
  )
  const currentQuestion = quiz.questions[currentIndex]
  const isLastQuestion = currentIndex === quiz.questions.length - 1

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [screen, currentIndex])

  const handleStart = (name: string) => {
    setParticipantName(name)
    setCurrentIndex(0)
    setAnswers({})
    setAnswerError(null)
    setSubmitError(null)
    setResult(null)
    setScreen('playing')
  }

  const handleAnswer = (value: QuizAnswerValue) => {
    if (!currentQuestion) return

    setAnswers((current) => ({ ...current, [currentQuestion.id]: value }))
    setAnswerError(null)
    setSubmitError(null)
  }

  const handleBack = () => {
    if (currentIndex === 0) return
    setCurrentIndex((index) => index - 1)
    setAnswerError(null)
    setSubmitError(null)
  }

  const handleSubmitAttempt = async () => {
    const payload = quiz.questions.map((question) => {
      const answer = answers[question.id]
      return {
        question_id: question.id,
        answer: typeof answer === 'string' ? answer.trim() : (answer ?? null),
      }
    })

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const attempt = await submitAttempt({
        code,
        participantName,
        answers: payload,
        fallbackMaxScore: totalPoints,
      })

      setResult(attempt)
      setScreen('result')
    } catch (error) {
      setSubmitError(playerErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (!currentQuestion || isSubmitting) return

    if (isLastQuestion) {
      const missingCount = quiz.questions.filter(
        (question) => !isAnswered(question, answers[question.id]),
      ).length

      if (missingCount > 0) {
        const firstMissingIndex = quiz.questions.findIndex(
          (question) => !isAnswered(question, answers[question.id]),
        )
        setAnswerError(
          formatMessage(id.player.question.unanswered, { count: missingCount }),
        )
        if (firstMissingIndex >= 0) setCurrentIndex(firstMissingIndex)
        return
      }

      void handleSubmitAttempt()
      return
    }

    if (!isAnswered(currentQuestion, answers[currentQuestion.id])) {
      setAnswerError(
        currentQuestion.type === 'multiple_choice'
          ? id.player.question.chooseRequired
          : id.player.question.textRequired,
      )
      return
    }

    setCurrentIndex((index) => index + 1)
    setAnswerError(null)
  }

  const handleAgain = () => {
    setAnswers({})
    setCurrentIndex(0)
    setAnswerError(null)
    setSubmitError(null)
    setResult(null)
    setScreen('playing')
  }

  if (screen === 'playing' && currentQuestion) {
    return (
      <QuizQuestionView
        quizTitle={quiz.title}
        question={currentQuestion}
        index={currentIndex}
        total={quiz.questions.length}
        answer={answers[currentQuestion.id]}
        onAnswer={handleAnswer}
        onBack={handleBack}
        onNext={handleNext}
        isLast={isLastQuestion}
        isSubmitting={isSubmitting}
        error={answerError}
        submitError={submitError}
      />
    )
  }

  if (screen === 'result' && result) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-4 py-6">
        <PlayerHeader />

        <QuizResultView
          quiz={quiz}
          participantName={participantName}
          answers={answers}
          result={result}
          onAgain={handleAgain}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-6">
      <PlayerHeader />

      <QuizIntro quiz={quiz} onStart={handleStart} />
    </main>
  )
}
