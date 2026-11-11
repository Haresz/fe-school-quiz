import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TimerBadge } from './TimerBadge'

describe('TimerBadge', () => {
  it('menampilkan sisa waktu dengan tenang', () => {
    render(<TimerBadge remainingSeconds={45} totalSeconds={60} />)

    expect(screen.getByText('Sisa waktu 0:45')).toBeInTheDocument()
    expect(screen.queryByText('Waktu hampir habis')).not.toBeInTheDocument()
  })

  it('memberi tanda tenang pada 10 detik terakhir', () => {
    render(<TimerBadge remainingSeconds={8} totalSeconds={60} />)

    expect(screen.getByText('Waktu hampir habis')).toBeInTheDocument()
  })

  it('mengumumkan hanya pada ambang penting', () => {
    const { rerender } = render(
      <TimerBadge remainingSeconds={45} totalSeconds={60} />,
    )
    expect(screen.queryByText('Sisa waktu 30 detik')).not.toBeInTheDocument()

    rerender(<TimerBadge remainingSeconds={30} totalSeconds={60} />)
    expect(screen.getByText('Sisa waktu 30 detik')).toBeInTheDocument()

    rerender(<TimerBadge remainingSeconds={29} totalSeconds={60} />)
    expect(screen.queryByText('Sisa waktu 30 detik')).not.toBeInTheDocument()

    rerender(<TimerBadge remainingSeconds={10} totalSeconds={60} />)
    expect(screen.getByText('Sisa waktu 10 detik')).toBeInTheDocument()
  })
})
