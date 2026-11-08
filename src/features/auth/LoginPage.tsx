import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { id } from '@/i18n/id'
import { authErrorMessage } from './auth-error-message'
import { useAuth } from './auth-context'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, id.auth.validation.emailRequired)
    .email(id.auth.validation.emailInvalid),
  password: z.string().min(1, id.auth.validation.passwordRequired),
})

type LoginValues = z.infer<typeof loginSchema>

type AuthLocationState = {
  from?: {
    pathname: string
    search?: string
    hash?: string
  }
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setServerError(null)

    try {
      await signIn(values.email, values.password)
      const from = (location.state as AuthLocationState | null)?.from
      const target = from
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/dashboard'
      navigate(target, { replace: true })
    } catch (error) {
      setServerError(authErrorMessage(error))
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-ink">{id.auth.login.title}</h1>
        <p className="text-base text-ink-muted">{id.auth.login.subtitle}</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label={id.auth.login.email}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={id.auth.login.password}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError ? (
            <p role="alert" className="text-base font-bold text-coral">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? id.auth.login.submitting : id.auth.login.submit}
          </Button>
        </form>

        <p className="mt-4 text-center text-base text-ink-muted">
          {id.auth.login.noAccount}{' '}
          <Link
            to="/signup"
            className="font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
          >
            {id.auth.login.signupLink}
          </Link>
        </p>
      </Card>

      <Link
        to="/"
        className="w-fit self-center rounded-input px-2 py-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
      >
        {id.auth.backHome}
      </Link>
    </main>
  )
}
