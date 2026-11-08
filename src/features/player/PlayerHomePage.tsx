import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { id } from '@/i18n/id'
import { QUIZ_CODE_LENGTH, normalizeQuizCode } from '@/lib/quiz-code'
import { CodeInput } from './CodeInput'

const emptyCode = () => Array<string>(QUIZ_CODE_LENGTH).fill('')

export function PlayerHomePage() {
  const navigate = useNavigate()
  const hintId = useId()
  const errorId = useId()
  const [code, setCode] = useState<string[]>(emptyCode)
  const [error, setError] = useState<string | null>(null)
  const codeValue = code.join('')

  const handleCodeChange = (nextCode: string[]) => {
    setCode(nextCode)
    if (error) setError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedCode = normalizeQuizCode(codeValue)

    if (normalizedCode.length < QUIZ_CODE_LENGTH) {
      setError(id.home.incompleteCode)
      return
    }

    navigate(`/play/${normalizedCode}`)
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center gap-8 overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="notebook-lines pointer-events-none absolute inset-x-0 top-0 h-44 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <div className="relative space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {id.app.name}
        </h1>
        <p className="max-w-prose text-xl leading-relaxed text-ink-muted">
          {id.app.tagline}
        </p>
      </div>

      <section className="relative space-y-5" aria-labelledby="code-title">
        <div className="space-y-1">
          <h2 id="code-title" className="text-2xl font-semibold text-ink">
            {id.home.codeLabel}
          </h2>
          <p id={hintId} className="max-w-[328px] text-lg text-ink-muted">
            {id.home.codeHint}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="max-w-[328px] space-y-4">
          <CodeInput
            value={code}
            onChange={handleCodeChange}
            invalid={Boolean(error)}
            describedBy={[hintId, error ? errorId : ''].filter(Boolean).join(' ')}
            autoFocus
          />

          {error ? (
            <p id={errorId} role="alert" className="text-lg font-bold text-coral">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full">
            {id.home.start}
          </Button>
        </form>
      </section>

      <Link
        to="/login"
        className="relative w-fit rounded-input px-2 py-2 text-lg font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {id.nav.creatorLogin}
      </Link>
    </main>
  )
}
