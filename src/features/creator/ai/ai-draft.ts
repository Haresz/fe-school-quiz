import type { AiQuizDraft } from '@/api/ai'
import {
  DEFAULT_PER_QUESTION_SECONDS,
  DEFAULT_TOTAL_MINUTES,
  readQuizTimer,
} from '@/lib/quiz-settings'
import {
  emptyQuizFormValues,
  makeEditorKey,
  totalMinutesFromSeconds,
  type QuizFormQuestion,
  type QuizFormValues,
} from '../quiz/quiz-form'

function mapQuestion(
  question: AiQuizDraft['questions'][number],
): QuizFormQuestion {
  if (question.type === 'text') {
    return {
      key: makeEditorKey(),
      type: 'text',
      body: question.body,
      points: String(question.points),
      explanation: question.explanation ?? '',
      options: [],
      correctOptionKey: '',
      acceptedAnswers: question.accepted_answers.map((answer) => ({
        key: makeEditorKey(),
        text: answer,
      })),
    }
  }

  const options = question.options.map((option) => ({
    key: makeEditorKey(),
    text: option,
  }))

  return {
    key: makeEditorKey(),
    type: 'multiple_choice',
    body: question.body,
    points: String(question.points),
    explanation: question.explanation ?? '',
    options,
    correctOptionKey: options[question.correct_index]?.key ?? '',
    acceptedAnswers: [],
  }
}

export function mapAiDraftToForm(draft: AiQuizDraft): QuizFormValues {
  const settings = draft.settings ?? {}
  const timer = readQuizTimer(settings.timer)

  return {
    ...emptyQuizFormValues(),
    title: draft.title,
    description: draft.description ?? '',
    status: 'draft',
    revealAnswers: settings.reveal_answers ?? true,
    shuffleQuestions: settings.shuffle_questions ?? true,
    shuffleOptions: settings.shuffle_options ?? true,
    timerMode: timer.mode,
    perQuestionSeconds:
      timer.mode === 'per_question'
        ? String(timer.seconds)
        : String(DEFAULT_PER_QUESTION_SECONDS),
    totalMinutes:
      timer.mode === 'total'
        ? totalMinutesFromSeconds(timer.seconds)
        : String(DEFAULT_TOTAL_MINUTES),
    questions: draft.questions.map(mapQuestion),
  }
}
