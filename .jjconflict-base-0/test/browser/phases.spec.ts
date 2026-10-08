import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { activeProfile } from '../../src/config/index.js'
import { closedResults } from '../../src/config/phases.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import type { Event } from '../../src/events/types.js'
import { organiserRouteDefinitions } from '../../src/organiser/routes.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'

const lifecycle = loadKdl(
  readFileSync(new URL('../fixtures/phases/workshop-lifecycle.kdl', import.meta.url), 'utf-8'),
  activeProfile.validation_view,
)
// The catalogue and family before workshop choice opens.
const beforeChoice = lifecycle.slice(
  0,
  lifecycle.findIndex(({ type }) => type === 'WorkshopChoiceOpened'),
)

/** Mirrors the Worker: closings are filled from the derivation at the reviewed head. */
function fillClosing(committed: readonly Event[], draft: Event): Event {
  const area = [...closedResults(activeProfile.modules).values()].find(
    ({ close_event }) => close_event === draft.type,
  )
  if (!area) return draft
  const world = derive(committed, activeProfile.validation_view)
  const contributions = composeSolverContributions(activeProfile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'development',
    compatibility_revision: 1,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
  return {
    ...draft,
    payload: {
      ...area.compute({ world, plan }),
      build_revision: 'development',
      compatibility_revision: 1,
    },
  }
}

async function serve(page: Page, initial: readonly Event[]) {
  const log: Event[] = [...initial]
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ principal: { kind: 'organiser', email: 'organiser@example.test' } }),
    }),
  )
  await page.route('**/api/organiser/log', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: log,
        head_seq: log.length,
        build_revision: 'development',
        compatibility_revision: 1,
        screen_registry: organiserRouteDefinitions.map(({ id, absolute_path: route, label }) => ({
          id,
          route,
          label,
          audience: 'organiser',
          host: 'kernel',
        })),
        feature_overrides: [],
      }),
    }),
  )
  await page.route('**/api/organiser/apply', async (route) => {
    const body = route.request().postDataJSON() as {
      events: { type: string; subject: string | null; payload: Event['payload'] }[]
    }
    const applied: Event[] = []
    for (const draft of body.events) {
      const event = fillClosing([...log, ...applied], {
        ...draft,
        seq: log.length + applied.length + 1,
        at: '2027-04-16T08:00:00.000Z',
        actor: 'organiser@example.test',
      } as Event)
      applied.push(event)
    }
    log.push(...applied)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: applied,
        head_seq: log.length,
        world: {},
        build_revision: 'development',
        compatibility_revision: 1,
        feature_overrides: [],
      }),
    })
  })
}

const track = (page: Page) =>
  page.getByRole('region', { name: 'Ablauf der Workshopwahl' }).getByRole('listitem')

test('organisers open workshop choice, close the area, and reopen it', async ({ page }) => {
  await serve(page, beforeChoice)
  await page.goto('/organiser/workshops')
  await expect(track(page).nth(1)).toHaveAttribute('aria-current', 'step')

  await page.getByRole('button', { name: 'Wahl öffnen' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Wahl öffnen' }).click()
  await expect(page.getByText('Die Workshopwahl ist geöffnet.')).toBeVisible()
  await expect(track(page).nth(2)).toHaveAttribute('aria-current', 'step')

  await page.getByRole('button', { name: 'Festlegen' }).click()
  const review = page.getByRole('alertdialog')
  await expect(review.getByRole('heading', { name: 'Workshops festlegen?' })).toBeVisible()
  await expect(review.getByText(/Das ist die erste Festlegung/)).toBeVisible()
  await expect(review.getByText('1 Familie betroffen')).toBeVisible()
  await review.getByRole('button', { name: 'Festlegen' }).click()

  await expect(track(page).nth(3)).toContainText('Festgelegt am')
  await expect(page.getByRole('button', { name: 'Wieder öffnen' })).toBeVisible()
  await page.getByRole('button', { name: 'Wieder öffnen' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Wieder öffnen' }).click()
  await expect(track(page).nth(2)).toHaveAttribute('aria-current', 'step')
  await expect(page.getByRole('button', { name: 'Erneut festlegen' })).toHaveCount(0)
})

test('every workshop stepper caller renders the same track', async ({ page }) => {
  await serve(
    page,
    lifecycle.slice(
      0,
      lifecycle.findIndex(({ type }) => type === 'WorkshopsClosed'),
    ),
  )
  const tracks: string[][] = []
  for (const path of [
    '/organiser/workshops',
    '/organiser/workshops/programme',
    '/organiser/workshops/allocation',
  ]) {
    await page.goto(path)
    await expect(track(page).first()).toBeVisible()
    tracks.push(
      await track(page).evaluateAll((items) =>
        items.map((item) => `${item.textContent}|${item.getAttribute('aria-current') ?? ''}`),
      ),
    )
  }
  expect(tracks[0]).toHaveLength(4)
  expect(tracks[1]).toEqual(tracks[0])
  expect(tracks[2]).toEqual(tracks[0])
})
