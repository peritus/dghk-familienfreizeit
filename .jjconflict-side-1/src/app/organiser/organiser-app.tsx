import { useAttentionClock } from './attention-clock.js'
import { associateFindingGroups } from '../../organiser/proposal.js'
import { decodeAttentionItems } from '../../attention/wire.js'
import { profileAttentionChecks } from '../../attention/profile.js'
import { operationFeedback } from '../../attention/operations.js'
import { EventInputError } from '../../events/types.js'
import { eventInputFindings } from '../../organiser/proposal.js'
import { AttentionRecovery } from './recovery.js'
import { closedAttentionContext } from '../../attention/closed.js'
import { derive, AppendInvariantError } from '../../events/fold.js'
import { profileAttention } from '../../attention/profile.js'
import {
  admitProfileProposal,
  CapacityReductionError,
  capacityReductionFinding,
  appendInvariantFindings,
} from '../../organiser/proposal.js'
import { ScreenLayout, ScreenHeader } from '../components/shared/ui/screen-layout.js'
import { ErrorState } from '../components/shared/ui/screen-state.js'
import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { activeProfile } from '../../config/index.js'
import { buildRevision, compatibilityRevision } from '../../config/build.js'
import type { EventDraft } from '../../events/types.js'
import { NotFound, RouteLoading } from '../components/application/route-states'
import { OrganiserDerivationError } from './derivation-error-state.js'
import { applyOrganiserEvents, loadOrganiserLog, OrganiserApiError, staleResponse } from './api.js'
import { OrganiserContext } from './context.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../solver/index.js'
import {
  deriveFeatureView,
  effectiveFeatureIds,
  sameFeatureOverrides,
} from '../../derive/features.js'
import { derivePhaseView, derivePhaseStatus, phaseActivation } from '../../derive/phases.js'
import { OrganiserFrame, OrganiserMinimalFrame } from './organiser-frame.js'
import {
  draftCount,
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

const evaluateAttention = profileAttention(activeProfile)

export default function OrganiserApp({ profile }: { profile?: ProfilePresentation }) {
  const now = useAttentionClock(activeProfile.meta.phase_dates ?? [])
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
          feature_overrides: log.feature_overrides,
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

  const domainUnavailable =
    state.status === 'loading' || state.status === 'unauthorized' || state.status === 'load_error'
  const committed = state.committed,
    drafts = state.drafts,
    revision = state.build_revision,
    compatibility = state.compatibility_revision
  const derivation = useMemo(() => {
    if (domainUnavailable) return { world: null, error: null }
    try {
      return {
        world:
          drafts.length === 0
            ? derive(committed, activeProfile.validation_view)
            : admitProfileProposal(
                committed,
                drafts.flatMap((group) => group.events),
                activeProfile,
                {
                  build_revision: revision ?? buildRevision,
                  compatibility_revision: compatibility ?? compatibilityRevision,
                },
              ).world,
        error: null,
      }
    } catch (error) {
      return {
        failures:
          error instanceof AppendInvariantError
            ? appendInvariantFindings(
                error,
                activeProfile,
                revision ?? buildRevision,
                new Date().toISOString(),
              )
            : error instanceof EventInputError
              ? eventInputFindings(
                  error,
                  activeProfile,
                  revision ?? buildRevision,
                  new Date().toISOString(),
                  drafts.find((_, index) => {
                    const before =
                      committed.length +
                      drafts.slice(0, index).reduce((sum, g) => sum + g.events.length, 0)
                    return (
                      error.seq !== null &&
                      error.seq > before &&
                      error.seq <= before + drafts[index]!.events.length
                    )
                  })?.id,
                )
              : [],
        failure:
          error instanceof CapacityReductionError
            ? capacityReductionFinding(
                error,
                activeProfile,
                revision ?? buildRevision,
                new Date().toISOString(),
              )
            : null,
        world: null,
        error: 'Die geplanten Änderungen können so nicht geprüft werden.',
      }
    }
  }, [committed, drafts, revision, compatibility, domainUnavailable])

  const baselineWorld = useMemo(() => {
    if (derivation.world || !drafts.length) return null
    try {
      return derive(committed, activeProfile.validation_view)
    } catch {
      return null
    }
  }, [derivation.world, committed, drafts.length])

  const currentPlan = useMemo(() => {
    if (domainUnavailable || !derivation.world || !revision || compatibility === null) return null
    const contributions = composeSolverContributions(activeProfile)
    return solve(buildSolverInput(derivation.world, contributions), contributions, {
      build_revision: revision,
      compatibility_revision: compatibility,
      event_date: activeProfile.meta.starts_on,
      profile: activeProfile,
      seed: null,
    })
  }, [derivation.world, revision, compatibility, domainUnavailable])

  const phaseStatus = useMemo(
    () =>
      derivation.world
        ? derivePhaseStatus({
            modules: activeProfile.modules,
            meta: activeProfile.meta,
            world: derivation.world,
            now,
          })
        : [],
    [derivation.world, now],
  )

  const effectiveFeatures = useMemo(
    () =>
      derivation.world
        ? effectiveFeatureIds(
            deriveFeatureView({
              modules: activeProfile.modules,
              world: derivation.world,
              overrides: state.feature_overrides,
              phase_active: phaseActivation(phaseStatus),
              principal: 'organiser',
            }),
          )
        : new Set<string>(),
    [derivation.world, phaseStatus, state.feature_overrides],
  )

  const closedChanges = useMemo(
    () =>
      derivation.world && currentPlan
        ? closedAttentionContext(derivation.world, currentPlan, activeProfile)
        : [],
    [derivation.world, currentPlan],
  )
  const attention = useMemo(
    () =>
      evaluateAttention({
        operations: [
          {
            id: 'organiser-session',
            code:
              state.status === 'loading'
                ? 'loading'
                : state.status === 'load_error'
                  ? 'load-failed'
                  : state.status === 'unauthorized'
                    ? 'unauthorized'
                    : state.status === 'applying'
                      ? 'saving'
                      : state.status === 'stale_head'
                        ? 'stale-head'
                        : state.status === 'stale_build'
                          ? 'stale-build'
                          : state.status === 'error'
                            ? 'apply-failed'
                            : state.drafts.length
                              ? 'drafts'
                              : 'saved',
          },
        ],
        rejected_findings: associateFindingGroups(
          [
            ...(state.attention_errors ?? []),
            ...(derivation.failure ? [derivation.failure] : []),
            ...(derivation.failures ?? []),
          ],
          state.drafts,
          state.head_seq,
        ),
        closed_changes: closedChanges,
        domain: derivation.world
          ? 'available'
          : state.status === 'loading'
            ? 'loading'
            : 'invalid-proposal',
        world: derivation.world,
        plan: currentPlan,
        profile: activeProfile,
        build_revision: state.build_revision ?? buildRevision,
        locale: activeProfile.meta.locale,
        now,
        audience: 'organiser',
        effective_features: effectiveFeatures,
        basis: {
          mode: state.drafts.length ? 'prospective' : 'committed',
          group_ids: state.drafts.flatMap((g) => (g.id ? [g.id] : [])),
        },
      }),
    [
      derivation.world,
      currentPlan,
      state.build_revision,
      state.status,
      state.attention_errors,
      state.drafts,
      state.head_seq,
      effectiveFeatures,
      now,
      closedChanges,
      derivation.failure,
      derivation.failures,
    ],
  )
  const phaseView = useMemo(
    () =>
      derivation.world
        ? derivePhaseView({
            world: derivation.world,
            modules: activeProfile.modules,
            meta: activeProfile.meta,
            plan: currentPlan,
            now,
            attention,
          })
        : [],
    [derivation.world, currentPlan, now, attention],
  )

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
      if (!sameFeatureOverrides(result.feature_overrides, state.feature_overrides)) {
        dispatch({
          type: 'failed',
          status: 'stale_build',
          error: 'Diese Ansicht ist veraltet. Bitte lade sie neu.',
        })
        return
      }
      dispatch({
        type: 'applied',
        count: drafts.length,
        events: result.events,
        saved_at: new Date().toISOString(),
      })
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
        findings:
          error instanceof OrganiserApiError && Array.isArray(error.body.findings)
            ? decodeAttentionItems(error.body.findings, profileAttentionChecks(activeProfile))
            : [],
        status: 'error',
        error: 'Die Änderungsentwürfe konnten nicht angewendet werden.',
      })
    }
  }, [state])

  useEffect(() => {
    if (
      derivation.world !== null &&
      state.change_mode === 'immediate' &&
      state.status !== 'applying' &&
      state.drafts.length > 0
    ) {
      void apply()
    }
  }, [apply, state.change_mode, state.drafts.length, state.status, derivation.world])

  if (state.status === 'loading')
    return (
      <OrganiserMinimalFrame profile={profile}>
        <RouteLoading />
      </OrganiserMinimalFrame>
    )
  if (state.status === 'unauthorized' || state.status === 'stale_build')
    return (
      <OrganiserMinimalFrame profile={profile}>
        <ScreenLayout header={<ScreenHeader title="Ansicht nicht verfügbar" />}>
          <ErrorState
            title={
              operationFeedback(state.status === 'unauthorized' ? 'unauthorized' : 'stale-build')
                .wording.title
            }
            onRetry={() => window.location.reload()}
            retry_label="Neu laden"
          >
            {
              operationFeedback(state.status === 'unauthorized' ? 'unauthorized' : 'stale-build')
                .wording.detail
            }
          </ErrorState>
        </ScreenLayout>
      </OrganiserMinimalFrame>
    )
  if (state.status === 'load_error')
    return (
      <OrganiserMinimalFrame profile={profile}>
        <ScreenLayout header={<ScreenHeader title="Organisationsdaten nicht verfügbar" />}>
          <ErrorState
            title={operationFeedback('load-failed').wording.title}
            onRetry={() => window.location.reload()}
            retry_label="Neu laden"
          >
            <p>
              {operationFeedback('load-failed').wording.detail} Solange die Daten fehlen, zeigt
              diese Ansicht keine Zahlen an.
            </p>
          </ErrorState>
        </ScreenLayout>
      </OrganiserMinimalFrame>
    )
  if (!derivation.world)
    return (
      <OrganiserContext.Provider
        value={{
          state,
          world: null,
          baseline_world: baselineWorld,
          dispatch,
          stage,
          apply,
          attention,
          current_plan: null,
        }}
      >
        <OrganiserMinimalFrame profile={profile}>
          <ScreenLayout header={<ScreenHeader title="Planung prüfen" />}>
            <AttentionRecovery
              findings={attention.items.filter(
                (item) =>
                  item.code !== 'attention-unavailable' && item.code !== 'operation.apply-failed',
              )}
            />
            <OrganiserDerivationError
              has_drafts={draftCount(state) > 0}
              message={
                draftCount(state) > 0
                  ? (derivation.error ??
                    state.error ??
                    'Die Planung konnte nicht berechnet werden.')
                  : 'Der gespeicherte Ereignisstand kann mit dieser Konfiguration nicht abgeleitet werden.'
              }
              onDiscard={() => dispatch({ type: 'discard' })}
              onReload={() => window.location.reload()}
            />
          </ScreenLayout>
        </OrganiserMinimalFrame>
      </OrganiserContext.Provider>
    )

  return (
    <OrganiserContext.Provider
      value={{
        state,
        world: derivation.world,
        dispatch,
        stage,
        apply,
        attention,
        current_plan: currentPlan,
        effective_features: effectiveFeatures,
        phases: phaseView,
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
