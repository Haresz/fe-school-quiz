import type { AiQuizDraft } from '@/api/ai'
import {
  emptyQuizFormValues,
  makeEditorKey,
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
  return {
    ...emptyQuizFormValues(),
    title: draft.title,
    description: draft.description ?? '',
    status: 'draft',
    revealAnswers: draft.settings?.reveal_answers ?? true,
    questions: draft.questions.map(mapQuestion),
  }
}
