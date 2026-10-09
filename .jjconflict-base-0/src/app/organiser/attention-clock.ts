import { useEffect, useState } from 'react'
/** The clock is operational input. It never derives or solves domain state. */
export function useAttentionClock(dates: readonly { target_at: string }[]) {
  const [now, setNow] = useState(() => new Date().toISOString())
  useEffect(() => {
    const refresh = () => setNow(new Date().toISOString())
    const instant = Date.now(),
      future = dates
        .map((date) => Date.parse(date.target_at) + 1)
        .filter((time) => time > instant)
        .sort((a, b) => a - b)
    const timer =
      future[0] === undefined
        ? null
        : window.setTimeout(refresh, Math.min(future[0] - instant, 2147483647))
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [now, dates])
  return now
}
