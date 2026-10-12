import { useMemo } from 'react'
import { render, screen, act, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useAttentionClock } from '../../src/app/organiser/attention-clock.js'
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
test('an idle target boundary and focus refresh time while retaining domain work', async () => {
  vi.useFakeTimers()
  vi.setSystemTime('2027-01-01T00:00:00Z')
  const dates = [{ target_at: '2027-01-01T00:00:01Z' }],
    solve = vi.fn((input: { head_seq: number }) => ({
      result: 'stable',
      head_seq: input.head_seq,
    })),
    world = { head_seq: 1 }
  function Fixture() {
    const now = useAttentionClock(dates),
      plan = useMemo(() => solve(world), [world])
    return (
      <output>
        {now} {plan.result}
      </output>
    )
  }
  const view = render(<Fixture />)
  expect(solve).toHaveBeenCalledOnce()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1001)
  })
  expect(screen.getByRole('status').textContent).toContain('2027-01-01T00:00:01.001Z')
  expect(solve).toHaveBeenCalledOnce()
  vi.setSystemTime('2027-01-02T00:00:00Z')
  act(() => window.dispatchEvent(new Event('focus')))
  expect(screen.getByRole('status').textContent).toContain('2027-01-02T00:00:00.000Z')
  expect(solve).toHaveBeenCalledOnce()
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
