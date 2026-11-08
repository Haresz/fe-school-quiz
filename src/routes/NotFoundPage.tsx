import { Link } from 'react-router-dom'
import { id } from '@/i18n/id'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-3xl font-bold text-ink">{id.notFound.title}</h1>
      <p className="text-base text-ink-muted">{id.notFound.description}</p>
      <Link
        to="/"
        className="rounded-input px-2 py-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {id.notFound.action}
      </Link>
    </main>
  )
}
