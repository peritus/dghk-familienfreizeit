import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { activeProfile } from '../../config/index.js'
import { buildRevision, compatibilityRevision } from '../../config/build.js'
import type { EventDraft } from '../../events/types.js'
import { NotFound, RouteLoading } from '../components/application/route-states'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { Button } from '../components/shared/ui/button'
import { applyOrganiserEvents, loadOrganiserLog, OrganiserApiError, staleResponse } from './api.js'
import { OrganiserContext } from './context.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../solver/index.js'
import { OrganiserFrame, OrganiserMinimalFrame } from './organiser-frame.js'
import {
  deriveWorld,
  initialOrganiserState,
  materializeDraftEvents,
  organiserReducer,
} from './state.js'
import { Dashboard } from './screens/dashboard.js'
import { Families } from './screens/families.js'
const Inventory = lazy(() =>
  import('./screens/inventory.js').then((module) => ({ default: module.Inventory })),
)
const AssignmentBoardScreen = lazy(() =>
  import('../../modules/room-assignment/app/screens/assignment-board.js').then((module) => ({
    default: module.AssignmentBoardScreen,
  })),
)
import {
  familyIdFromRouteSegment,
  isFamilyTopic,
  organiserPaths,
  organiserRoutePaths,
  personIdFromRouteSegment,
} from '../../organiser/routes.js'
import { organiserScreenRegistry } from '../../organiser/registry.js'
import type { ProfilePresentation } from '../../config/presentation.js'

function AccommodationRedirect() {
  const [, navigate] = useLocation()

  useEffect(() => {
    void navigate(organiserPaths.inventory(), { replace: true })
  }, [navigate])

  return <RouteLoading />
}

const Workshops = lazy(() =>
  import('./screens/workshops.js').then((module) => ({ default: module.Workshops })),
)
const WorkshopLeaders = lazy(() =>
  import('./screens/workshops.js').then((module) => ({ default: module.WorkshopLeaders })),
)
const WorkshopExternalLeaders = lazy(() =>
  import('./screens/workshops.js').then((module) => ({ default: module.WorkshopExternalLeaders })),
)
const WorkshopProgramme = lazy(() =>
  import('./screens/workshops.js').then((module) => ({ default: module.WorkshopProgramme })),
)
const WorkshopSlots = lazy(() =>
  import('./screens/workshops.js').then((module) => ({ default: module.WorkshopSlots })),
)
const WorkshopSpaces = lazy(() =>
  import('./screens/workshops.js').then((module) => ({ default: module.WorkshopSpaces })),
)
const WorkshopAllocation = lazy(() =>
  import('./screens/workshop-allocation.js').then((module) => ({
    default: module.WorkshopAllocation,
  })),
)
const WorkshopParticipation = lazy(() =>
  import('./screens/workshop-participation.js').then((module) => ({
    default: module.WorkshopParticipationScreen,
  })),
)
const WorkshopLists = lazy(() =>
  import('./screens/workshop-reports.js').then((module) => ({ default: module.WorkshopLists })),
)
const FamilyDetail = lazy(() =>
  import('./screens/family-detail.js').then((module) => ({ default: module.FamilyDetail })),
)

export default function OrganiserApp({ profile }: { profile?: ProfilePresentation }) {
  const [state, dispatch] = useReducer(organiserReducer, initialOrganiserState)

  const stage = useCallback((events: readonly EventDraft[]) => {
    dispatch({ type: 'stage', events })
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch('/api/me').then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          principal?: { kind?: string; email?: string }
        }
        if (!response.ok) throw new OrganiserApiError(response.status, body)
        return body
      }),
      loadOrganiserLog(),
    ])
      .then(([me, log]) => {
        if (cancelled) return
        if (me.principal?.kind !== 'organiser' || !me.principal.email) {
          redirectToLogin()
          return
        }
        if (
          log.build_revision !== buildRevision ||
          log.compatibility_revision !== compatibilityRevision
        ) {
          dispatch({
            type: 'failed',
            status: 'stale_build',
            error: 'Diese Ansicht ist veraltet. Bitte lade sie neu.',
          })
          return
        }
        dispatch({
          type: 'loaded',
          events: log.events,
          build_revision: log.build_revision,
          compatibility_revision: log.compatibility_revision,
          principal_email: me.principal.email,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof OrganiserApiError && error.status === 401) {
          redirectToLogin()
          return
        }
        dispatch({
          type: 'failed',
          status:
            error instanceof OrganiserApiError && error.status === 401
              ? 'unauthorized'
              : 'load_error',
          error:
            error instanceof OrganiserApiError && error.status === 401
              ? 'Bitte melde Dich als Organisationsteam an.'
              : 'Die Familiendaten konnten nicht geladen werden.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const derivation = useMemo(() => {
    if (
      state.status === 'loading' ||
      state.status === 'unauthorized' ||
      state.status === 'load_error'
    )
      return { world: null, error: null }
    try {
      return { world: deriveWorld(state, activeProfile.validation_view), error: null }
    } catch {
      return {
        world: null,
        error: 'Die geplanten Änderungen können so nicht geprüft werden.',
      }
    }
  }, [state])

  const currentPlan = useMemo(() => {
    if (
      state.status === 'loading' ||
      state.status === 'unauthorized' ||
      state.status === 'load_error' ||
      !derivation.world ||
      !state.build_revision ||
      state.compatibility_revision === null
    )
      return null
    const contributions = composeSolverContributions(activeProfile)
    return solve(buildSolverInput(derivation.world, contributions), contributions, {
      build_revision: state.build_revision,
      compatibility_revision: state.compatibility_revision,
      event_date: activeProfile.meta.starts_on,
      profile: activeProfile,
      seed: null,
    })
  }, [derivation.world, state])

  const apply = useCallback(async () => {
    if (!state.build_revision || state.compatibility_revision === null) return
    const drafts = materializeDraftEvents(state)
    if (drafts.length === 0 || state.status === 'applying') return
    dispatch({ type: 'applying' })
    try {
      const result = await applyOrganiserEvents({
        input_seq: state.head_seq,
        events: drafts.map(({ type, subject, payload }) => ({
          type,
          subject,
          payload,
        })),
        build_revision: state.build_revision,
        compatibility_revision: state.compatibility_revision,
      })
      dispatch({ type: 'applied', count: drafts.length, events: result.events })
    } catch (error: unknown) {
      if (error instanceof OrganiserApiError) {
        const stale = staleResponse(error)
        if (stale) {
          dispatch({ type: 'rebased', events: stale.events })
          return
        }
        if (error.body.error === 'stale_build') {
          dispatch({
            type: 'failed',
            status: 'stale_build',
            error: 'Diese Ansicht ist veraltet. Bitte lade sie neu.',
          })
          return
        }
      }
      dispatch({
        type: 'failed',
        status: 'error',
        error: 'Die Änderungsentwürfe konnten nicht angewendet werden.',
      })
    }
  }, [state])

  useEffect(() => {
    if (
      state.change_mode === 'immediate' &&
      state.status !== 'applying' &&
      state.drafts.length > 0
    ) {
      void apply()
    }
  }, [apply, state.change_mode, state.drafts.length, state.status])

  if (state.status === 'loading')
    return (
      <OrganiserMinimalFrame profile={profile}>
        <RouteLoading />
      </OrganiserMinimalFrame>
    )
  if (state.status === 'unauthorized' || state.status === 'stale_build')
    return (
      <OrganiserMinimalFrame profile={profile}>
        <p role="alert">{state.error}</p>
      </OrganiserMinimalFrame>
    )
  if (state.status === 'load_error')
    return (
      <OrganiserMinimalFrame profile={profile}>
        <Alert role="alert" className="bg-secondary-background">
          <AlertTitle>Die Organisationsdaten konnten nicht geladen werden</AlertTitle>
          <AlertDescription>
            <p>{state.error} Solange die Daten fehlen, zeigt diese Ansicht keine Zahlen an.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Neu laden
            </Button>
          </AlertDescription>
        </Alert>
      </OrganiserMinimalFrame>
    )
  if (!derivation.world)
    return (
      <OrganiserMinimalFrame profile={profile}>
        <div className="space-y-4" role="alert">
          <p>{derivation.error ?? state.error}</p>
          <Button variant="neutral" onClick={() => dispatch({ type: 'discard' })}>
            Änderungsentwürfe verwerfen
          </Button>
        </div>
      </OrganiserMinimalFrame>
    )

  return (
    <OrganiserContext.Provider
      value={{
        state,
        world: derivation.world,
        dispatch,
        stage,
        apply,
        current_plan: currentPlan,
      }}
    >
      <OrganiserFrame profile={profile}>
        <Suspense fallback={<RouteLoading />}>
          <Switch>
            <Route path={organiserRoutePaths.dashboard}>
              <Dashboard />
            </Route>
            <Route path={organiserRoutePaths.families}>
              <Families />
            </Route>
            <Route path={organiserRoutePaths.family_person_topic}>
              {(params) => {
                try {
                  if (!isFamilyTopic(params.topic) || params.topic === 'zimmer') {
                    return <NotFound />
                  }
                  return (
                    <FamilyDetail
                      family_id={familyIdFromRouteSegment(params.id)}
                      topic={params.topic}
                      person_id={personIdFromRouteSegment(params.person_id)}
                    />
                  )
                } catch {
                  return <NotFound />
                }
              }}
            </Route>
            <Route path={organiserRoutePaths.family_topic}>
              {(params) => {
                try {
                  if (!isFamilyTopic(params.topic)) return <NotFound />
                  return (
                    <FamilyDetail
                      family_id={familyIdFromRouteSegment(params.id)}
                      topic={params.topic}
                    />
                  )
                } catch {
                  return <NotFound />
                }
              }}
            </Route>
            <Route path={organiserRoutePaths.family_detail}>
              {(params) => {
                try {
                  return <FamilyDetail family_id={familyIdFromRouteSegment(params.id)} />
                } catch {
                  return <NotFound />
                }
              }}
            </Route>
            <Route path={organiserRoutePaths.accommodation}>
              <AccommodationRedirect />
            </Route>
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-inventory') ? (
              <Route path={organiserRoutePaths.inventory}>
                <Inventory />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-assignment-board') ? (
              <Route path={organiserRoutePaths.assignment_board}>
                <AssignmentBoardScreen />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshops') ? (
              <Route path={organiserRoutePaths.workshops}>
                <Workshops />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-leaders') ? (
              <Route path={organiserRoutePaths.workshop_leaders}>
                <WorkshopLeaders />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(
              ({ id }) => id === 'organiser-workshop-external-leaders',
            ) ? (
              <Route path={organiserRoutePaths.workshop_external_leaders}>
                <WorkshopExternalLeaders />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-programme') ? (
              <Route path={organiserRoutePaths.workshop_programme}>
                <WorkshopProgramme />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(
              ({ id }) => id === 'organiser-workshop-programme-unplaced',
            ) ? (
              <Route path={organiserRoutePaths.workshop_programme_unplaced}>
                <WorkshopProgramme />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(
              ({ id }) => id === 'organiser-workshop-programme-overlaps',
            ) ? (
              <Route path={organiserRoutePaths.workshop_programme_overlaps}>
                <WorkshopProgramme />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-allocation') ? (
              <Route path={organiserRoutePaths.workshop_allocation}>
                <WorkshopAllocation />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-participation') ? (
              <Route path={organiserRoutePaths.workshop_participation}>
                <WorkshopParticipation />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(
              ({ id }) => id === 'organiser-workshop-allocation-demand',
            ) ? (
              <Route path={organiserRoutePaths.workshop_allocation_demand}>
                <WorkshopAllocation />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(
              ({ id }) => id === 'organiser-workshop-allocation-trace',
            ) ? (
              <Route path={organiserRoutePaths.workshop_allocation_trace}>
                <WorkshopAllocation />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-slots') ? (
              <Route path={organiserRoutePaths.workshop_slots}>
                <WorkshopSlots />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-spaces') ? (
              <Route path={organiserRoutePaths.workshop_spaces}>
                <WorkshopSpaces />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-lists') ? (
              <Route path={organiserRoutePaths.workshop_lists}>
                <WorkshopLists />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(
              ({ id }) => id === 'organiser-workshop-list-workshops',
            ) ? (
              <Route path={organiserRoutePaths.workshop_workshop_list}>
                <WorkshopLists />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-list-persons') ? (
              <Route path={organiserRoutePaths.workshop_person_list}>
                <WorkshopLists />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-list-families') ? (
              <Route path={organiserRoutePaths.workshop_family_list}>
                <WorkshopLists />
              </Route>
            ) : null}
            {organiserScreenRegistry.some(({ id }) => id === 'organiser-workshop-list-rooms') ? (
              <Route path={organiserRoutePaths.workshop_room_list}>
                <WorkshopLists />
              </Route>
            ) : null}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Suspense>
      </OrganiserFrame>
    </OrganiserContext.Provider>
  )
}

function redirectToLogin(): void {
  window.history.replaceState({}, '', '/login')
  window.dispatchEvent(new PopStateEvent('popstate'))
}
