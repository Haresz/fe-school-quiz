import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/auth-context'
import { id } from '@/i18n/id'

export function CreatorLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    navigate('/', { replace: true })
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-white focus:px-4 focus:py-3 focus:text-base focus:font-bold focus:text-ink focus:outline-none focus:ring-[3px] focus:ring-blue"
      >
        {id.common.skipToContent}
      </a>

      <header className="border-b border-paper-line bg-white">
        <div className="mx-auto flex w-full max-w-[960px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/dashboard"
            className="rounded-input font-display text-xl font-semibold text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
          >
            {id.app.name}
          </Link>

          <nav className="flex items-center gap-2" aria-label="Navigasi pembuat kuis">
            <Link
              to="/dashboard"
              aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
              className="flex min-h-11 items-center rounded-input px-3 text-base font-bold text-ink hover:bg-blue-tint focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue"
            >
              {id.nav.dashboard}
            </Link>
            <Button
              variant="secondary"
              onClick={handleSignOut}
              disabled={isSigningOut}
              aria-label={id.nav.logout}
            >
              {isSigningOut ? id.common.loading : id.nav.logout}
            </Button>
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[960px] px-4 py-8 focus:outline-none"
      >
        <Outlet />
      </main>
    </div>
  )
}
