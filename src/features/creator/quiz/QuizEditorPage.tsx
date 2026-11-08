import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import {
  getQuizForEdit,
  saveQuiz,
  type QuizEditorData,
  type SavedQuiz,
} from '@/api/quizzes'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { id } from '@/i18n/id'
import type { QuizSource, QuizStatus } from '@/types/database'
import { QuestionEditor } from './QuestionEditor'
import { quizErrorMessage } from './quiz-error-message'
import {
  buildQuizSavePayload,
  createBlankQuestion,
  emptyQuizFormValues,
  mapEditorDataToForm,
  quizFormSchema,
  type QuizFormValues,
} from './quiz-form'

type SavedQuizState = SavedQuiz & {
  status: QuizStatus
}

export function QuizEditorPage() {
  const params = useParams()
  const quizId = params.id

  const quizQuery = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => getQuizForEdit(quizId as string),
    enabled: Boolean(quizId),
  })

  if (quizId && quizQuery.isPending) {
    return (
      <Card>
        <Spinner label={id.editor.loading} />
      </Card>
    )
  }

  if (quizId && quizQuery.isError && !quizQuery.data) {
    return (
      <div className="space-y-4">
        <ErrorState
          title={id.editor.loadErrorTitle}
          description={quizErrorMessage(quizQuery.error)}
          onRetry={() => {
            void quizQuery.refetch()
          }}
        />
        <Link
          to="/dashboard"
          className="inline-flex min-h-11 items-center rounded-input px-2 font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.editor.backToDashboard}
        </Link>
      </div>
    )
  }

  return (
    <QuizEditorForm
      key={quizQuery.data?.id ?? 'new-quiz'}
      initialData={quizQuery.data}
    />
  )
}

function QuizEditorForm({ initialData }: { initialData?: QuizEditorData }) {
  const queryClient = useQueryClient()
  const [defaultValues] = useState<QuizFormValues>(() =>
    initialData ? mapEditorDataToForm(initialData) : emptyQuizFormValues(),
  )
  const [meta] = useState<{ source: QuizSource; materialId: string | null }>({
    source: initialData?.source ?? 'manual',
    materialId: initialData?.materialId ?? null,
  })
  const [activeQuizId, setActiveQuizId] = useState(initialData?.id)
  const [saved, setSaved] = useState<SavedQuizState | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues,
  })

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'questions',
  })

  const questions = useWatch({ control, name: 'questions' })
  const status = useWatch({ control, name: 'status' })
  const totalPoints = questions.reduce((total, question) => {
    const points = Number(question.points)
    return total + (Number.isFinite(points) ? points : 0)
  }, 0)

  const saveMutation = useMutation({
    mutationFn: (values: QuizFormValues) =>
      saveQuiz(
        buildQuizSavePayload(values, {
          id: activeQuizId,
          source: meta.source,
          materialId: meta.materialId,
        }),
      ),
    onSuccess: (result, values) => {
      if (!activeQuizId) {
        window.history.replaceState(
          window.history.state,
          '',
          `/quizzes/${result.id}/edit`,
        )
      }

      setActiveQuizId(result.id)
      setSaved({ ...result, status: values.status })
      setCopied(false)
      reset(values)
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      void queryClient.invalidateQueries({ queryKey: ['quiz', result.id] })
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    await saveMutation.mutateAsync(values).catch(() => undefined)
  })

  const shareUrl = saved
    ? `${window.location.origin}/play/${saved.share_code}`
    : ''

  const handleCopyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const isSaving = isSubmitting || saveMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {activeQuizId ? id.editor.editTitle : id.editor.newTitle}
          </h1>
          <p className="max-w-prose text-base text-ink-muted">{id.editor.subtitle}</p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex min-h-11 items-center rounded-input px-2 font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.editor.backToDashboard}
        </Link>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">{id.editor.infoTitle}</h2>

          <Input
            label={id.editor.titleLabel}
            hint={id.editor.titleHint}
            error={errors.title?.message}
            {...register('title')}
          />

          <Textarea
            label={id.editor.descriptionLabel}
            hint={id.editor.descriptionHint}
            error={errors.description?.message}
            {...register('description')}
          />
        </Card>

        <section className="space-y-4" aria-labelledby="questions-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 id="questions-title" className="text-2xl font-semibold text-ink">
                {id.editor.questionsTitle}
              </h2>
              <p className="max-w-prose text-base text-ink-muted">
                {id.editor.questionsHint}
              </p>
            </div>
            <p className="rounded-pill bg-yellow-tint px-3 py-1 text-sm font-bold text-ink">
              {id.editor.questionTotal}: {totalPoints}
            </p>
          </div>

          {fields.length === 0 ? (
            <EmptyState title={id.editor.emptyQuestions} />
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <QuestionEditor
                  key={field.id}
                  index={index}
                  total={fields.length}
                  control={control}
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                  errors={errors}
                  onMoveUp={() => move(index, index - 1)}
                  onMoveDown={() => move(index, index + 1)}
                  onRemove={() => remove(index)}
                />
              ))}
            </div>
          )}

          {errors.questions?.message ? (
            <p role="alert" className="text-sm font-bold text-coral">
              {errors.questions.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => append(createBlankQuestion('multiple_choice'))}
              disabled={fields.length >= 50}
            >
              {id.editor.addMultipleChoice}
            </Button>
            <Button
              variant="secondary"
              onClick={() => append(createBlankQuestion('text'))}
              disabled={fields.length >= 50}
            >
              {id.editor.addText}
            </Button>
          </div>

          {fields.length >= 50 ? (
            <p className="text-sm text-ink-muted">{id.editor.questionLimit}</p>
          ) : null}
        </section>

        <Card className="space-y-5">
          <h2 className="text-xl font-semibold text-ink">{id.editor.settingsTitle}</h2>

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-ink">
              {id.editor.statusLabel}
            </legend>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-input border-2 border-ink bg-white p-3 has-[:checked]:border-blue has-[:checked]:bg-blue-tint">
                <input
                  type="radio"
                  value="draft"
                  className="mt-0.5 size-5 accent-blue"
                  {...register('status')}
                />
                <span>
                  <span className="block text-base font-bold text-ink">
                    {id.editor.statusDraft}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {id.editor.statusHintDraft}
                  </span>
                </span>
              </label>

              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-input border-2 border-ink bg-white p-3 has-[:checked]:border-blue has-[:checked]:bg-blue-tint">
                <input
                  type="radio"
                  value="published"
                  className="mt-0.5 size-5 accent-blue"
                  {...register('status')}
                />
                <span>
                  <span className="block text-base font-bold text-ink">
                    {id.editor.statusPublished}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {id.editor.statusHintPublished}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-input border-2 border-paper-line p-3">
            <input
              type="checkbox"
              className="mt-0.5 size-5 accent-blue"
              {...register('revealAnswers')}
            />
            <span>
              <span className="block text-base font-bold text-ink">
                {id.editor.revealAnswers}
              </span>
              <span className="mt-1 block text-sm text-ink-muted">
                {id.editor.revealAnswersHint}
              </span>
            </span>
          </label>
        </Card>

        {saved && !isDirty ? (
          <section className="space-y-4 rounded-card border-2 border-green bg-green-tint/40 p-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-ink">
                  {saved.status === 'published'
                    ? id.editor.savedPublishedTitle
                    : id.editor.savedDraftTitle}
                </h2>
                <Chip variant={saved.status === 'published' ? 'published' : 'draft'} />
              </div>
              <p className="text-base text-ink-muted">
                {saved.status === 'published'
                  ? id.editor.savedPublishedBody
                  : id.editor.savedDraftBody}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-ink">{id.editor.shareCodeLabel}</p>
              <p className="font-display text-4xl font-bold tracking-[0.25em] text-ink">
                {saved.share_code}
              </p>
              <p className="break-all text-sm text-ink-muted">{shareUrl}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={handleCopyLink}>
                {copied ? id.editor.copied : id.editor.copyLink}
              </Button>
              {saved.status === 'published' ? (
                <Link
                  to={`/play/${saved.share_code}`}
                  className="inline-flex min-h-11 items-center rounded-input px-2 font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
                >
                  {id.editor.openPlayer}
                </Link>
              ) : null}
            </div>

            {copied ? (
              <p role="status" className="text-sm font-bold text-green">
                {id.editor.copied}
              </p>
            ) : null}
          </section>
        ) : null}

        {saveMutation.isError ? (
          <ErrorState
            title={id.editor.saveErrorTitle}
            description={quizErrorMessage(saveMutation.error)}
          />
        ) : null}

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {status === 'published'
              ? id.editor.statusHintPublished
              : id.editor.statusHintDraft}
          </p>
          <Button type="submit" size="lg" disabled={isSaving}>
            {isSaving ? id.editor.saving : id.editor.save}
          </Button>
        </Card>
      </form>
    </div>
  )
}
