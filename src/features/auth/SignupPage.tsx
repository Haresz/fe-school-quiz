import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { id } from '@/i18n/id'
import { authErrorMessage } from './auth-error-message'
import { useAuth } from './auth-context'

const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, id.auth.validation.displayNameMax)
    .optional(),
  email: z
    .string()
    .trim()
    .min(1, id.auth.validation.emailRequired)
    .email(id.auth.validation.emailInvalid),
  password: z.string().min(6, id.auth.validation.passwordMin),
})

type SignupValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  })

  const onSubmit = async (values: SignupValues) => {
    setServerError(null)

    try {
      const result = await signUp({
        email: values.email,
        password: values.password,
        displayName: values.displayName || undefined,
      })

      if (result.needsEmailConfirmation) {
        setConfirmationEmail(values.email)
        return
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setServerError(authErrorMessage(error))
    }
  }

  if (confirmationEmail) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-4 py-10">
        <Card className="space-y-4">
          <h1 className="text-3xl font-bold text-ink">{id.auth.confirmEmail.title}</h1>
          <p className="text-base leading-relaxed text-ink-muted">
            {id.auth.confirmEmail.body}
          </p>
          <p className="break-all text-base font-bold text-ink">{confirmationEmail}</p>
          <Button onClick={() => navigate('/login', { replace: true })}>
            {id.auth.confirmEmail.action}
          </Button>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-ink">{id.auth.signup.title}</h1>
        <p className="text-base text-ink-muted">{id.auth.signup.subtitle}</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label={id.auth.signup.displayName}
            hint={id.auth.signup.displayNameHint}
            type="text"
            autoComplete="nickname"
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <Input
            label={id.auth.signup.email}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={id.auth.signup.password}
            hint={id.auth.signup.passwordHint}
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError ? (
            <p role="alert" className="text-sm font-bold text-coral">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? id.auth.signup.submitting : id.auth.signup.submit}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-muted">
          {id.auth.signup.haveAccount}{' '}
          <Link
            to="/login"
            className="font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
          >
            {id.auth.signup.loginLink}
          </Link>
        </p>
      </Card>

      <Link
        to="/"
        className="w-fit self-center rounded-input px-2 py-2 text-sm font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
      >
        {id.auth.backHome}
      </Link>
    </main>
  )
}
