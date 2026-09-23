import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { Route, Switch } from 'wouter'
import { activeProfile } from '../../config/index.js'
import { buildRevision, compatibilityRevision } from '../../config/build.js'
import { NotFound, RouteLoading } from '../components/route-states'
import { applyOrganiserEvents, loadOrganiserLog, OrganiserApiError, staleResponse } from './api.js'
import { OrganiserContext } from './context.js'
import { OrganiserFrame } from './organiser-frame.js'
import {
  deriveOrganiserWorld,
  initialOrganiserState,
  materializePendingEvents,
  organiserReducer,
} from './state.js'
import { Dashboard } from './screens/dashboard.js'
import { Families } from './screens/families.js'
import { FamilyDetail } from './screens/family-detail.js'

export default function OrganiserApp() {
  const [state, dispatch] = useReducer(organiserReducer, initialOrganiserState)

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
          dispatch({
            type: 'failed',
            status: 'unauthorized',
            error: 'Bitte melde Dich als Organisationsteam an.',
          })
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
        dispatch({
          type: 'failed',
          status:
            error instanceof OrganiserApiError && error.status === 401 ? 'unauthorized' : 'error',
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
    if (state.status === 'loading' || state.status === 'unauthorized' || state.status === 'error')
      return { world: null, error: null }
    try {
      return { world: deriveOrganiserWorld(state, activeProfile.validation_view), error: null }
    } catch {
      return {
        world: null,
        error: 'Die offenen Änderungen ergeben noch keinen gültigen Ereignisstand.',
      }
    }
  }, [state])

  const apply = useCallback(async () => {
    if (!state.build_revision || state.compatibility_revision === null) return
    dispatch({ type: 'applying' })
    try {
      const result = await applyOrganiserEvents({
        input_seq: state.head_seq,
        events: materializePendingEvents(state).map(({ type, subject, payload }) => ({
          type,
          subject,
          payload,
        })),
        build_revision: state.build_revision,
        compatibility_revision: state.compatibility_revision,
      })
      dispatch({ type: 'applied', events: result.events })
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
        error: 'Die Änderungen konnten nicht angewendet werden.',
      })
    }
  }, [state])

  if (state.status === 'loading') return <RouteLoading />
  if (state.status === 'unauthorized' || state.status === 'stale_build')
    return <p role="alert">{state.error}</p>
  if (!derivation.world) return <p role="alert">{derivation.error ?? state.error}</p>

  return (
    <OrganiserContext.Provider value={{ state, world: derivation.world, dispatch, apply }}>
      <OrganiserFrame>
        <Switch>
          <Route path="/">
            <Dashboard />
          </Route>
          <Route path="/families">
            <Families />
          </Route>
          <Route path="/families/:id">{(params) => <FamilyDetail family_id={params.id} />}</Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </OrganiserFrame>
    </OrganiserContext.Provider>
  )
}
