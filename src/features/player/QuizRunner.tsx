import { useEffect, useMemo, useRef, useState } from 'react'
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
import { QuizQuestionView } from './QuizQuestionView'
import { isAnswered, type QuizAnswerValue } from './quiz-answers'
import { QuizResultView } from './QuizResultView'
import { QuizReview } from './QuizReview'
import { createQuizSession, type QuizSession } from './quiz-session'
import { useCountdown } from './use-countdown'

type PlayerScreen = 'intro' | 'playing' | 'review' | 'result'

export function QuizRunner({ quiz, code }: { quiz: PlayerQuiz; code: string }) {
  const [screen, setScreen] = useState<PlayerScreen>('intro')
  const [participantName, setParticipantName] = useState('')
  const [answers, setAnswers] = useState<Record<string, QuizAnswerValue>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [session, setSession] = useState<QuizSession | null>(null)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<PlayerAttemptResult | null>(null)
  const submittingRef = useRef(false)

  const orderedQuestions = useMemo(() => {
    if (!session) return []
    const questionsById = new Map(
      quiz.questions.map((question) => [question.id, question]),
    )
    return session.questionOrder
      .map((questionId) => questionsById.get(questionId))
      .filter((question): question is PlayerQuestion => question !== undefined)
  }, [quiz, session])

  const totalPoints = quiz.questions.reduce(
    (total, question) => total + question.points,
    0,
  )
  const currentQuestion = orderedQuestions[currentIndex]
  const isLastQuestion =
    orderedQuestions.length > 0 && currentIndex === orderedQuestions.length - 1
  const timerMode = quiz.timer.mode
  const timerEnabled = quiz.timer.mode !== 'none'
  const canGoBack = timerMode !== 'per_question'
  const canReview = timerMode !== 'per_question'
  const timerRunning = (screen === 'playing' || screen === 'review') && timerEnabled

  const handleStart = (name: string) => {
    setParticipantName(name)
    setCurrentIndex(0)
    setAnswers({})
    setSession(createQuizSession(quiz))
    setAnswerError(null)
    setSubmitError(null)
    setNotice(null)
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
    setNotice(null)
  }

  const handleSubmitAttempt = async () => {
    if (submittingRef.current) return
    submittingRef.current = true

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
      setNotice(null)
      setScreen('result')
    } catch (error) {
      setSubmitError(playerErrorMessage(error))
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (!currentQuestion || isSubmitting || submittingRef.current) return

    if (isLastQuestion) {
      const missingCount = orderedQuestions.filter(
        (question) => !isAnswered(question, answers[question.id]),
      ).length

      if (missingCount > 0) {
        const firstMissingIndex = orderedQuestions.findIndex(
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

    setNotice(null)
    setCurrentIndex((index) => index + 1)
    setAnswerError(null)
  }

  const handleOpenReview = () => {
    setAnswerError(null)
    setSubmitError(null)
    setScreen('review')
  }

  const handleEditQuestion = (index: number) => {
    setCurrentIndex(index)
    setAnswerError(null)
    setSubmitError(null)
    setScreen('playing')
  }

  const handleReviewSubmit = () => {
    if (isSubmitting || submittingRef.current) return

    const missingCount = orderedQuestions.filter(
      (question) => !isAnswered(question, answers[question.id]),
    ).length

    if (missingCount > 0) {
      const firstMissingIndex = orderedQuestions.findIndex(
        (question) => !isAnswered(question, answers[question.id]),
      )
      setAnswerError(
        formatMessage(id.player.question.unanswered, { count: missingCount }),
      )
      if (firstMissingIndex >= 0) setCurrentIndex(firstMissingIndex)
      setScreen('playing')
      return
    }

    void handleSubmitAttempt()
  }

  const handleAgain = () => {
    setAnswers({})
    setCurrentIndex(0)
    setSession(createQuizSession(quiz))
    setAnswerError(null)
    setSubmitError(null)
    setNotice(null)
    setResult(null)
    setScreen('playing')
  }

  const handleTimerExpire = () => {
    if (!currentQuestion) return

    if (timerMode === 'per_question' && !isLastQuestion) {
      setNotice(id.player.timer.questionExpired)
      setAnswerError(null)
      setCurrentIndex((index) => index + 1)
      return
    }

    setNotice(id.player.timer.submitExpired)
    void handleSubmitAttempt()
  }

  const remainingSeconds = useCountdown({
    seconds:
      timerRunning && quiz.timer.mode !== 'none' ? quiz.timer.seconds : null,
    resetKey:
      quiz.timer.mode === 'per_question'
        ? (currentQuestion?.id ?? 'question')
        : 'total',
    paused: submitError !== null,
    onExpire: handleTimerExpire,
  })

  const timer =
    timerRunning && quiz.timer.mode !== 'none' && remainingSeconds !== null
      ? { remainingSeconds, totalSeconds: quiz.timer.seconds }
      : null

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [screen, currentIndex])

  if (screen === 'playing' && currentQuestion) {
    return (
      <QuizQuestionView
        quizTitle={quiz.title}
        question={currentQuestion}
        index={currentIndex}
        total={orderedQuestions.length}
        answer={answers[currentQuestion.id]}
        optionOrder={session?.optionOrders[currentQuestion.id] ?? []}
        timer={timer}
        notice={notice}
        onAnswer={handleAnswer}
        onBack={handleBack}
        onNext={handleNext}
        onReview={isLastQuestion && canReview ? handleOpenReview : null}
        onRetry={() => void handleSubmitAttempt()}
        canGoBack={canGoBack}
        isLast={isLastQuestion}
        isSubmitting={isSubmitting}
        error={answerError}
        submitError={submitError}
      />
    )
  }

  if (screen === 'review') {
    return (
      <QuizReview
        quizTitle={quiz.title}
        questions={orderedQuestions}
        optionOrders={session?.optionOrders ?? {}}
        answers={answers}
        timer={timer}
        onEditQuestion={handleEditQuestion}
        onSubmit={handleReviewSubmit}
        onBack={() => setScreen('playing')}
        onRetry={() => void handleSubmitAttempt()}
        isSubmitting={isSubmitting}
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
          questions={orderedQuestions}
          optionOrders={session?.optionOrders ?? {}}
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
