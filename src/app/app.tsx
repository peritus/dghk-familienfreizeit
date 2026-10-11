import { lazy, Suspense } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { Shell } from './components/application/shell'
import { NotFound, RouteBoundary, RouteLoading } from './components/application/route-states'
import { AppSelection } from './auth/apps'
import { Login } from './auth/login'
import { OccasionLanding } from './public-view/occasion-landing'
import type { ProfilePresentation } from '../config/presentation.js'

const FamilyApp = lazy(() => import('./family/family-app'))
const OrganiserApp = lazy(() => import('./organiser/organiser-app'))

export function App({ profile }: { profile?: ProfilePresentation } = {}) {
  const [location] = useLocation()

  return (
    <Shell profile={profile}>
      <RouteBoundary
        reset_key={location}
        render_fallback={
          location === '/organiser' ||
          location.startsWith('/organiser/') ||
          location === '/family' ||
          location.startsWith('/family/')
            ? (content) => (
                <Shell profile={profile} force_frame>
                  {content}
                </Shell>
              )
            : undefined
        }
      >
        <Switch>
          <Route path="/">{profile ? <OccasionLanding profile={profile} /> : null}</Route>
          <Route path="/login">
            <Login />
          </Route>
          <Route path="/apps">
            <AppSelection />
          </Route>
          <Route path="/family" nest>
            <Suspense
              fallback={
                <Shell profile={profile} force_frame>
                  <RouteLoading />
                </Shell>
              }
            >
              <FamilyApp profile={profile} />
            </Suspense>
          </Route>
          <Route path="/organiser" nest>
            <Suspense
              fallback={
                <Shell profile={profile} force_frame>
                  <RouteLoading />
                </Shell>
              }
            >
              <OrganiserApp profile={profile} />
            </Suspense>
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </RouteBoundary>
    </Shell>
  )
}
