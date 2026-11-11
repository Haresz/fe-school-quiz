import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './use-countdown'

type HarnessProps = {
  seconds: number | null
  resetKey: string
  paused?: boolean
  onExpire?: () => void
}

function Harness({ seconds, resetKey, paused, onExpire }: HarnessProps) {
  const remaining = useCountdown({ seconds, resetKey, paused, onExpire })
  return (
    <p data-testid="remaining">{remaining === null ? 'off' : remaining}</p>
  )
}

function remainingText() {
  return screen.getByTestId('remaining').textContent
}

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('menghitung mundur berdasarkan deadline absolut', () => {
    render(<Harness seconds={60} resetKey="q1" />)
    expect(remainingText()).toBe('60')

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(remainingText()).toBe('50')
  })

  it('tetap akurat saat waktu melompat jauh', () => {
    render(<Harness seconds={60} resetKey="q1" />)

    act(() => {
      vi.advanceTimersByTime(45_000)
    })
    expect(remainingText()).toBe('15')
  })

  it('memanggil onExpire sekali saat waktu habis', () => {
    const onExpire = vi.fn()
    render(<Harness seconds={5} resetKey="q1" onExpire={onExpire} />)

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(remainingText()).toBe('0')
  })

  it('menghitung ulang saat visibilitychange', () => {
    render(<Harness seconds={60} resetKey="q1" />)

    act(() => {
      vi.advanceTimersByTime(20_000)
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(remainingText()).toBe('40')
  })

  it('membekukan waktu saat paused dan melanjutkan setelahnya', () => {
    const { rerender } = render(
      <Harness seconds={60} resetKey="q1" paused={false} />,
    )

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(remainingText()).toBe('50')

    rerender(<Harness seconds={60} resetKey="q1" paused />)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(remainingText()).toBe('50')

    rerender(<Harness seconds={60} resetKey="q1" paused={false} />)
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(remainingText()).toBe('45')
  })

  it('mereset waktu saat resetKey berubah', () => {
    const { rerender } = render(<Harness seconds={30} resetKey="q1" />)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(remainingText()).toBe('20')

    rerender(<Harness seconds={30} resetKey="q2" />)
    expect(remainingText()).toBe('30')
  })

  it('nonaktif saat durasi null', () => {
    render(<Harness seconds={null} resetKey="q1" />)
    expect(remainingText()).toBe('off')
  })
})
