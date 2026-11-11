import { Card } from '@/components/ui/Card'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'
import type { QuizFormQuestion } from './quiz-form'

export function QuestionReadOnly({ questions }: { questions: QuizFormQuestion[] }) {
  return (
    <ol className="space-y-4">
      {questions.map((question, index) => {
        const correctOption = question.options.find(
          (option) => option.key === question.correctOptionKey,
        )

        return (
          <li key={question.key}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-xl font-semibold text-ink">
                  Soal {index + 1}
                </h3>
                <p className="rounded-pill bg-paper px-3 py-1 text-base font-bold text-ink">
                  {formatMessage(id.editor.pointsValue, {
                    points: Number(question.points) || 0,
                  })}
                </p>
              </div>

              <p className="max-w-prose whitespace-pre-wrap text-base leading-relaxed text-ink">
                {question.body}
              </p>

              <p className="text-base font-bold text-ink-muted">
                {question.type === 'multiple_choice'
                  ? id.editor.question.typeMultipleChoice
                  : id.editor.question.typeText}
              </p>

              {question.type === 'multiple_choice' ? (
                <div className="space-y-2">
                  <p className="text-base font-bold text-ink">
                    {id.editor.question.optionsLabel}
                  </p>
                  <ul className="space-y-1">
                    {question.options.map((option, optionIndex) => (
                      <li
                        key={option.key}
                        className="flex flex-wrap items-start gap-2 text-base text-ink"
                      >
                        <span aria-hidden="true">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span>{option.text}</span>
                        {option.key === correctOption?.key ? (
                          <span className="rounded-pill bg-green-tint px-2 py-0.5 font-bold text-green">
                            {id.editor.correctAnswerLabel}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-base font-bold text-ink">
                    {id.editor.question.acceptedLabel}
                  </p>
                  <p className="text-base text-ink">
                    {question.acceptedAnswers
                      .map((answer) => answer.text)
                      .join(', ')}
                  </p>
                </div>
              )}

              {question.explanation.trim() ? (
                <div className="space-y-1 border-t border-paper-line pt-3">
                  <p className="text-base font-bold text-ink">
                    {id.editor.question.explanationLabel}
                  </p>
                  <p className="whitespace-pre-wrap text-base text-ink-muted">
                    {question.explanation}
                  </p>
                </div>
              ) : null}
            </Card>
          </li>
        )
      })}
    </ol>
  )
}
