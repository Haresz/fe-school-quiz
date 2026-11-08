import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { id } from '@/i18n/id'
import type { QuestionType } from '@/types/database'
import {
  createBlankAcceptedAnswer,
  createBlankOption,
  type QuizFormValues,
} from './quiz-form'

type QuestionEditorProps = {
  index: number
  total: number
  control: Control<QuizFormValues>
  register: UseFormRegister<QuizFormValues>
  setValue: UseFormSetValue<QuizFormValues>
  getValues: UseFormGetValues<QuizFormValues>
  errors: FieldErrors<QuizFormValues>
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

const optionLetters = 'ABCDEF'

export function QuestionEditor({
  index,
  total,
  control,
  register,
  setValue,
  getValues,
  errors,
  onMoveUp,
  onMoveDown,
  onRemove,
}: QuestionEditorProps) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({ control, name: `questions.${index}.options` })

  const {
    fields: acceptedFields,
    append: appendAccepted,
    remove: removeAccepted,
  } = useFieldArray({ control, name: `questions.${index}.acceptedAnswers` })

  const type = useWatch({ control, name: `questions.${index}.type` })
  const correctOptionKey = useWatch({
    control,
    name: `questions.${index}.correctOptionKey`,
  })
  const questionErrors = errors.questions?.[index]
  const questionNumber = index + 1

  const handleTypeChange = (nextType: QuestionType) => {
    if (nextType === type) return

    setValue(`questions.${index}.type`, nextType, {
      shouldDirty: true,
      shouldValidate: false,
    })

    if (nextType === 'multiple_choice') {
      if (getValues(`questions.${index}.options`).length < 2) {
        setValue(`questions.${index}.options`, [createBlankOption(), createBlankOption()])
      }
      setValue(`questions.${index}.correctOptionKey`, '', { shouldDirty: true })
    } else if (getValues(`questions.${index}.acceptedAnswers`).length < 1) {
      setValue(`questions.${index}.acceptedAnswers`, [createBlankAcceptedAnswer()])
    }
  }

  const handleRemoveOption = (optionIndex: number) => {
    const optionKey = getValues(`questions.${index}.options.${optionIndex}.key`)
    if (getValues(`questions.${index}.correctOptionKey`) === optionKey) {
      setValue(`questions.${index}.correctOptionKey`, '', { shouldDirty: true })
    }
    removeOption(optionIndex)
  }

  const handleRemove = () => {
    if (window.confirm(id.editor.question.removeQuestionConfirm)) {
      onRemove()
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`question-${index}-title`} className="text-xl font-semibold text-ink">
          Soal {questionNumber} dari {total}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onMoveUp} disabled={index === 0}>
            {id.editor.question.moveUp}
          </Button>
          <Button variant="ghost" onClick={onMoveDown} disabled={index === total - 1}>
            {id.editor.question.moveDown}
          </Button>
          <Button variant="ghost" onClick={handleRemove}>
            {id.editor.question.removeQuestion}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">{id.editor.question.typeLabel}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={type === 'multiple_choice' ? 'primary' : 'secondary'}
            aria-pressed={type === 'multiple_choice'}
            onClick={() => handleTypeChange('multiple_choice')}
          >
            {id.editor.question.typeMultipleChoice}
          </Button>
          <Button
            variant={type === 'text' ? 'primary' : 'secondary'}
            aria-pressed={type === 'text'}
            onClick={() => handleTypeChange('text')}
          >
            {id.editor.question.typeText}
          </Button>
        </div>
      </div>

      <Textarea
        label={id.editor.question.bodyLabel}
        placeholder={id.editor.question.bodyPlaceholder}
        error={questionErrors?.body?.message}
        {...register(`questions.${index}.body`)}
      />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <Textarea
          label={id.editor.question.explanationLabel}
          hint={id.editor.question.explanationHint}
          error={questionErrors?.explanation?.message}
          {...register(`questions.${index}.explanation`)}
        />
        <Input
          label={id.editor.question.pointsLabel}
          type="number"
          min={1}
          inputMode="numeric"
          error={questionErrors?.points?.message}
          {...register(`questions.${index}.points`)}
        />
      </div>

      {type === 'multiple_choice' ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-ink">
            {id.editor.question.optionsLabel}
          </legend>
          <p className="text-sm text-ink-muted">{id.editor.question.optionsHint}</p>

          <div className="space-y-3">
            {optionFields.map((field, optionIndex) => {
              const letter = optionLetters[optionIndex] ?? String(optionIndex + 1)
              const optionError = questionErrors?.options?.[optionIndex]?.text?.message
              const inputId = `question-${index}-option-${optionIndex}`

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-2"
                >
                  <label
                    htmlFor={inputId}
                    className="mt-0.5 flex size-11 cursor-pointer items-center justify-center rounded-pill border-2 border-ink bg-white font-display text-lg font-semibold text-ink has-[:checked]:bg-ink has-[:checked]:text-white focus-within:ring-[3px] focus-within:ring-blue focus-within:ring-offset-2 focus-within:ring-offset-white"
                    title={`Tandai pilihan ${letter} sebagai jawaban benar`}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name={`question-${index}-correct`}
                      value={field.key}
                      checked={correctOptionKey === field.key}
                      onChange={() =>
                        setValue(`questions.${index}.correctOptionKey`, field.key, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className="sr-only"
                      aria-label={`Tandai pilihan ${letter} sebagai jawaban benar`}
                    />
                    <span aria-hidden="true">{letter}</span>
                  </label>

                  <Input
                    label={`${id.editor.question.optionLabel} ${letter}`}
                    placeholder={id.editor.question.optionPlaceholder}
                    error={optionError}
                    {...register(`questions.${index}.options.${optionIndex}.text`)}
                  />

                  <Button
                    variant="ghost"
                    className="mt-6"
                    onClick={() => handleRemoveOption(optionIndex)}
                    disabled={optionFields.length <= 2}
                    aria-label={`${id.editor.question.removeOption} pilihan ${letter}`}
                  >
                    {id.editor.question.removeOption}
                  </Button>
                </div>
              )
            })}
          </div>

          {questionErrors?.options?.message ? (
            <p role="alert" className="text-sm font-bold text-coral">
              {questionErrors.options.message}
            </p>
          ) : null}

          {questionErrors?.correctOptionKey?.message ? (
            <p role="alert" className="text-sm font-bold text-coral">
              {questionErrors.correctOptionKey.message}
            </p>
          ) : null}

          <Button
            variant="secondary"
            onClick={() => appendOption(createBlankOption())}
            disabled={optionFields.length >= 6}
          >
            {id.editor.question.addOption}
          </Button>
        </fieldset>
      ) : (
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-ink">
            {id.editor.question.acceptedLabel}
          </legend>
          <p className="text-sm text-ink-muted">{id.editor.question.acceptedHint}</p>

          <div className="space-y-3">
            {acceptedFields.map((field, answerIndex) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label={`${id.editor.question.acceptedLabel} ${answerIndex + 1}`}
                    placeholder={id.editor.question.acceptedPlaceholder}
                    error={
                      questionErrors?.acceptedAnswers?.[answerIndex]?.text?.message
                    }
                    {...register(`questions.${index}.acceptedAnswers.${answerIndex}.text`)}
                  />
                </div>
                <Button
                  variant="ghost"
                  className="mt-6"
                  onClick={() => removeAccepted(answerIndex)}
                  disabled={acceptedFields.length <= 1}
                  aria-label={`${id.editor.question.removeAccepted} jawaban ${answerIndex + 1}`}
                >
                  {id.editor.question.removeAccepted}
                </Button>
              </div>
            ))}
          </div>

          {questionErrors?.acceptedAnswers?.message ? (
            <p role="alert" className="text-sm font-bold text-coral">
              {questionErrors.acceptedAnswers.message}
            </p>
          ) : null}

          <Button
            variant="secondary"
            onClick={() => appendAccepted(createBlankAcceptedAnswer())}
            disabled={acceptedFields.length >= 10}
          >
            {id.editor.question.addAccepted}
          </Button>
        </fieldset>
      )}
    </Card>
  )
}
