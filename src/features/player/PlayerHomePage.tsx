import { Link } from 'react-router-dom'
import { id } from '@/i18n/id'

export function PlayerHomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {id.app.name}
        </h1>
        <p className="max-w-prose text-xl leading-relaxed text-ink-muted">{id.app.tagline}</p>
      </div>

      <section className="rounded-card border border-paper-line bg-white p-6">
        <h2 className="text-xl font-semibold text-ink">{id.home.codeLabel}</h2>
        <p className="mt-1 text-base text-ink-muted">{id.home.codeHint}</p>
        <div className="mt-5 grid grid-cols-6 gap-2" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className="aspect-[4/5] rounded-input border-2 border-paper-line bg-paper"
            />
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-muted">{id.home.comingSoon}</p>
      </section>

      <Link
        to="/login"
        className="w-fit rounded-input px-2 py-2 text-base font-bold text-blue underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {id.nav.creatorLogin}
      </Link>
    </main>
  )
}
