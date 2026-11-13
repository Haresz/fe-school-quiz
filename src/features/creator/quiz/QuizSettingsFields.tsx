import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { id } from '@/i18n/id'
import { formatMessage } from '@/lib/message'

export type QuizSettingsFormValues = {
  revealAnswers: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  timerMode: 'none' | 'per_question' | 'total'
  perQuestionSeconds: string
  totalMinutes: string
}

type QuizSettingsFieldsProps = {
  register: UseFormRegister<QuizSettingsFormValues>
  errors: FieldErrors<QuizSettingsFormValues>
  timerMode: QuizSettingsFormValues['timerMode']
  perQuestionSeconds: string
  totalMinutes: string
  disabled?: boolean
}

export function QuizSettingsFields({
  register,
  errors,
  timerMode,
  perQuestionSeconds,
  totalMinutes,
  disabled = false,
}: QuizSettingsFieldsProps) {
  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-input border-2 border-paper-line p-3">
        <input
          type="checkbox"
          disabled={disabled}
          className="mt-0.5 size-5 accent-blue disabled:cursor-not-allowed"
          {...register('revealAnswers')}
        />
        <span>
          <span className="block text-base font-bold text-ink">
            {id.editor.revealAnswers}
          </span>
          <span className="mt-1 block text-base text-ink-muted">
            {id.editor.revealAnswersHint}
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-input border-2 border-paper-line p-3">
        <input
          type="checkbox"
          disabled={disabled}
          className="mt-0.5 size-5 accent-blue disabled:cursor-not-allowed"
          {...register('shuffleQuestions')}
        />
        <span>
          <span className="block text-base font-bold text-ink">
            {id.editor.shuffleQuestions}
          </span>
          <span className="mt-1 block text-base text-ink-muted">
            {id.editor.shuffleQuestionsHint}
          </span>
        </span>
      </label>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-input border-2 border-paper-line p-3">
          <input
            type="checkbox"
            disabled={disabled}
            className="mt-0.5 size-5 accent-blue disabled:cursor-not-allowed"
            {...register('shuffleOptions')}
          />
          <span>
            <span className="block text-base font-bold text-ink">
              {id.editor.shuffleOptions}
            </span>
            <span className="mt-1 block text-base text-ink-muted">
              {id.editor.shuffleOptionsHint}
            </span>
          </span>
        </label>
        <p className="px-3 text-base text-ink-muted">
          {id.editor.shuffleOptionsNote}
        </p>
      </div>

      <fieldset className="space-y-3 border-t border-paper-line pt-5">
        <legend className="text-base font-bold text-ink">
          {id.editor.timerLabel}
        </legend>

        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ['none', id.editor.timerNone],
              ['per_question', id.editor.timerPerQuestion],
              ['total', id.editor.timerTotal],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-input border-2 border-ink bg-white p-3 has-[:checked]:border-blue has-[:checked]:bg-blue-tint"
            >
              <input
                type="radio"
                value={value}
                disabled={disabled}
                className="size-5 accent-blue disabled:cursor-not-allowed"
                {...register('timerMode')}
              />
              <span className="text-base font-bold text-ink">{label}</span>
            </label>
          ))}
        </div>

        {timerMode === 'per_question' ? (
          <Input
            type="number"
            inputMode="numeric"
            min={5}
            max={600}
            label={id.editor.timerPerQuestionLabel}
            hint={id.editor.timerPerQuestionHint}
            error={errors.perQuestionSeconds?.message}
            disabled={disabled}
            {...register('perQuestionSeconds')}
          />
        ) : null}

        {timerMode === 'total' ? (
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            label={id.editor.timerTotalLabel}
            hint={id.editor.timerTotalHint}
            error={errors.totalMinutes?.message}
            disabled={disabled}
            {...register('totalMinutes')}
          />
        ) : null}

        {timerMode === 'per_question' ? (
          <p aria-live="polite" className="text-base font-bold text-ink">
            {formatMessage(id.editor.timerPerQuestionPreview, {
              seconds: perQuestionSeconds,
            })}
          </p>
        ) : null}

        {timerMode === 'total' ? (
          <p aria-live="polite" className="text-base font-bold text-ink">
            {formatMessage(id.editor.timerTotalPreview, {
              minutes: totalMinutes,
            })}
          </p>
        ) : null}

        <p className="text-base text-ink-muted">{id.editor.timerNote}</p>
      </fieldset>
    </div>
  )
}
