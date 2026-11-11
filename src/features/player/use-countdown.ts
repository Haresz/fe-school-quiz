import { useEffect, useRef, useState } from 'react'

export type UseCountdownOptions = {
  seconds: number | null
  resetKey: string | number
  paused?: boolean
  onExpire?: () => void
}

type CountdownState = {
  key: string | number | null
  seconds: number | null
  remainingSeconds: number | null
}

export function useCountdown({
  seconds,
  resetKey,
  paused = false,
  onExpire,
}: UseCountdownOptions): number | null {
  const [state, setState] = useState<CountdownState>(() => ({
    key: resetKey,
    seconds,
    remainingSeconds: seconds,
  }))
  const deadlineRef = useRef<number | null>(null)
  const pausedRemainingMsRef = useRef<number | null>(null)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  if (state.key !== resetKey || state.seconds !== seconds) {
    setState({ key: resetKey, seconds, remainingSeconds: seconds })
  }

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    expiredRef.current = false
    pausedRemainingMsRef.current = null
    deadlineRef.current =
      seconds === null ? null : Date.now() + seconds * 1000
  }, [seconds, resetKey])

  useEffect(() => {
    if (seconds === null) return

    if (paused) {
      if (deadlineRef.current !== null && pausedRemainingMsRef.current === null) {
        pausedRemainingMsRef.current = Math.max(
          0,
          deadlineRef.current - Date.now(),
        )
        deadlineRef.current = null
      }
      return
    }

    if (pausedRemainingMsRef.current !== null) {
      deadlineRef.current = Date.now() + pausedRemainingMsRef.current
      pausedRemainingMsRef.current = null
    }
  }, [paused, seconds])

  useEffect(() => {
    if (seconds === null) return

    const update = () => {
      if (pausedRemainingMsRef.current !== null) return

      const deadline = deadlineRef.current
      if (deadline === null) return

      const remainingMs = deadline - Date.now()
      setState((current) => ({
        ...current,
        remainingSeconds:
          seconds === null ? null : Math.max(0, Math.ceil(remainingMs / 1000)),
      }))

      if (remainingMs <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current?.()
      }
    }

    update()
    const intervalId = window.setInterval(update, 250)
    const handleVisibilityChange = () => update()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [seconds, resetKey])

  return state.remainingSeconds
}
