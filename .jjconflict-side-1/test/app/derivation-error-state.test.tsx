import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { OrganiserDerivationError } from '../../src/app/organiser/derivation-error-state.js'

test('a derivation error with drafts offers to discard them', () => {
  const onDiscard = vi.fn()
  const onReload = vi.fn()
  render(
    <OrganiserDerivationError
      has_drafts
      message="Die geplanten Änderungen können so nicht geprüft werden."
      onDiscard={onDiscard}
      onReload={onReload}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Änderungsentwürfe verwerfen' }))

  expect(onDiscard).toHaveBeenCalledOnce()
  expect(onReload).not.toHaveBeenCalled()
})

test('a derivation error without drafts identifies stored data and offers reload', () => {
  const onDiscard = vi.fn()
  const onReload = vi.fn()
  render(
    <OrganiserDerivationError
      has_drafts={false}
      message="Der gespeicherte Ereignisstand kann mit dieser Konfiguration nicht abgeleitet werden."
      onDiscard={onDiscard}
      onReload={onReload}
    />,
  )

  expect(screen.getByText(/gespeicherte Ereignisstand/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Neu laden' }))

  expect(onReload).toHaveBeenCalledOnce()
  expect(onDiscard).not.toHaveBeenCalled()
})
