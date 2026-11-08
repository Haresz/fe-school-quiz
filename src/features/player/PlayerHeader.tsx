import { Link } from 'react-router-dom'
import { id } from '@/i18n/id'

export function PlayerHeader() {
  return (
    <header className="mb-6">
      <Link
        to="/"
        className="rounded-input font-display text-xl font-semibold text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
      >
        {id.app.name}
      </Link>
    </header>
  )
}
