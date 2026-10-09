import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ApplicationFrame } from '../../src/app/components/application/application-frame.js'
import { PrintFooter } from '../../src/app/components/shared/ui/print-layout.js'

afterEach(cleanup)

test('paper margin metadata comes from the specialised footer and restores the frame footer before printing', () => {
  const fixed = new Date('2027-04-01T10:00:00Z')
  const { rerender } = render(
    <ApplicationFrame brand="Event" print_footer={{ context: 'Frame', generated_at: fixed }}>
      <PrintFooter
        context="Specialised"
        revision={8}
        confidentiality="Private"
        generated_at={fixed}
      />
    </ApplicationFrame>,
  )
  const margin = () => document.documentElement.style.getPropertyValue('--print-footer-text')
  expect(margin()).toContain('Specialised')
  expect(margin()).toContain('Datenstand v8')
  expect(margin()).toContain('Private')
  rerender(
    <ApplicationFrame brand="Event" print_footer={{ context: 'Frame', generated_at: fixed }}>
      <p>New view</p>
    </ApplicationFrame>,
  )
  fireEvent(window, new Event('beforeprint'))
  expect(margin()).toContain('Frame')
  expect(margin()).not.toContain('Specialised')
})
