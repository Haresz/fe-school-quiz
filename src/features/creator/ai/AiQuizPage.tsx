import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AiApiError, generateQuizWithAi } from '@/api/ai'
import { listActiveMaterials } from '@/api/materials'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/auth-context'
import { id } from '@/i18n/id'
import { QuizSettingsFields } from '../quiz/QuizSettingsFields'
import { aiErrorMessage } from './ai-error-message'
import {
  aiFormSchema,
  buildAiDraftSettings,
  buildGenerateInput,
  emptyAiFormValues,
  type AiFormValues,
} from './ai-form'

export function AiQuizPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const materialsQuery = useQuery({
    queryKey: ['materials', 'active'],
    queryFn: listActiveMaterials,
  })

  const [defaultValues] = useState<AiFormValues>(emptyAiFormValues)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AiFormValues>({
    resolver: zodResolver(aiFormSchema),
    defaultValues,
  })

  const timerMode = useWatch({ control, name: 'timerMode' })
  const perQuestionSeconds = useWatch({ control, name: 'perQuestionSeconds' })
  const totalMinutes = useWatch({ control, name: 'totalMinutes' })

  const generateMutation = useMutation({
    mutationFn: async (values: AiFormValues) => {
      const accessToken = session?.access_token
      if (!accessToken) throw new AiApiError('unauthorized')

      const result = await generateQuizWithAi(
        buildGenerateInput(values),
        accessToken,
      )

      return {
        ...result,
        draft: {
          ...result.draft,
          settings: {
            ...result.draft.settings,
            ...buildAiDraftSettings(values),
          },
        },
      }
    },
    onSuccess: ({ draft }) => {
      navigate('/quizzes/new', { state: { aiDraft: draft } })
    },
  })

  const onSubmit = handleSubmit((values) => {
    generateMutation.reset()
    generateMutation.mutate(values)
  })

  const isGenerating = generateMutation.isPending
  const materials = materialsQuery.data ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-4">
        <Link
          to="/dashboard"
          className="inline-flex min-h-11 items-center rounded-input px-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
        >
          {id.ai.backToDashboard}
        </Link>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {id.ai.title}
          </h1>
          <p className="max-w-prose text-base text-ink-muted">{id.ai.subtitle}</p>
        </div>
      </div>

      {materialsQuery.isPending ? (
        <Card>
          <Spinner label={id.ai.materialLoading} />
        </Card>
      ) : null}

      {materialsQuery.isError ? (
        <ErrorState
          title={id.ai.materialErrorTitle}
          description={id.ai.materialErrorBody}
          onRetry={() => {
            void materialsQuery.refetch()
          }}
        />
      ) : null}

      {!materialsQuery.isPending &&
      !materialsQuery.isError &&
      materials.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 border-dashed">
          <h2 className="text-xl font-semibold text-ink">
            {id.ai.materialEmptyTitle}
          </h2>
          <p className="max-w-prose text-base text-ink-muted">
            {id.ai.materialEmptyBody}
          </p>
          <Link
            to="/quizzes/new"
            className="inline-flex min-h-11 items-center rounded-input px-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
          >
            {id.ai.createManually}
          </Link>
        </Card>
      ) : null}

      {!materialsQuery.isPending &&
      !materialsQuery.isError &&
      materials.length > 0 ? (
        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-ink">{id.ai.formTitle}</h2>
            <p className="max-w-prose text-base text-ink-muted">
              {id.ai.formHint}
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <Select
              label={id.ai.materialLabel}
              hint={id.ai.materialHint}
              error={errors.materialId?.message}
              disabled={isGenerating}
              {...register('materialId')}
            >
              <option value="">{id.ai.materialPlaceholder}</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.subject} kelas {material.grade} — {material.topic}
                </option>
              ))}
            </Select>

            <Textarea
              label={id.ai.promptLabel}
              hint={id.ai.promptHint}
              error={errors.prompt?.message}
              placeholder={id.ai.promptPlaceholder}
              maxLength={500}
              disabled={isGenerating}
              {...register('prompt')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                label={id.ai.numQuestionsLabel}
                hint={id.ai.numQuestionsHint}
                error={errors.numQuestions?.message}
                disabled={isGenerating}
                {...register('numQuestions')}
              />

              <Select
                label={id.ai.mixLabel}
                hint={id.ai.mixHint}
                error={errors.mix?.message}
                disabled={isGenerating}
                {...register('mix')}
              >
                <option value="mixed">{id.ai.mixMixed}</option>
                <option value="mc_only">{id.ai.mixMcOnly}</option>
                <option value="text_only">{id.ai.mixTextOnly}</option>
              </Select>
            </div>

            <Select
              label={id.ai.difficultyLabel}
              error={errors.difficulty?.message}
              disabled={isGenerating}
              {...register('difficulty')}
            >
              <option value="mudah">{id.ai.difficultyEasy}</option>
              <option value="sedang">{id.ai.difficultyMedium}</option>
              <option value="sulit">{id.ai.difficultyHard}</option>
            </Select>

            <div className="space-y-3 border-t border-paper-line pt-5">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-ink">
                  {id.ai.settingsTitle}
                </h3>
                <p className="max-w-prose text-base text-ink-muted">
                  {id.ai.settingsHint}
                </p>
              </div>

              <QuizSettingsFields
                register={register}
                errors={errors}
                timerMode={timerMode}
                perQuestionSeconds={perQuestionSeconds}
                totalMinutes={totalMinutes}
                disabled={isGenerating}
              />
            </div>

            {generateMutation.isError ? (
              <ErrorState
                title={id.ai.errorTitle}
                description={aiErrorMessage(generateMutation.error)}
              />
            ) : null}

            {isGenerating ? (
              <p
                role="status"
                className="rounded-input border border-paper-line bg-paper px-4 py-3 text-base font-bold text-ink-muted"
              >
                {id.ai.submittingStatus}
              </p>
            ) : null}

            <div className="rounded-input border border-paper-line bg-yellow-tint/50 p-4">
              <h3 className="text-base font-bold text-ink">{id.ai.noteTitle}</h3>
              <p className="mt-1 text-base text-ink-muted">{id.ai.noteBody}</p>
            </div>

            <div className="flex justify-end border-t border-paper-line pt-4">
              <Button type="submit" size="lg" disabled={isGenerating}>
                {isGenerating ? id.ai.submitting : id.ai.submit}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
