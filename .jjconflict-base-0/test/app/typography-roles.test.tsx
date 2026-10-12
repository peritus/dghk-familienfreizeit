import { expect, test } from 'vitest'
import { cn } from '../../src/app/lib/utils.js'

test('responsive font roles participate in the same override group as fixed sizes', () => {
  expect(cn('text-figure font-heading', 'text-base font-bold')).toBe(
    'font-heading text-base font-bold',
  )
  expect(cn('text-sm text-muted', 'text-title')).toBe('text-muted text-title')
  expect(cn('text-title', 'text-body')).toBe('text-body')
})
