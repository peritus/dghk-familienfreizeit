import { lazy, Suspense } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { Shell } from './components/application/shell'
import { NotFound, RouteBoundary, RouteLoading } from './components/application/route-states'
import { Login } from './auth/login'
import { Welcome } from './family-view/welcome'

const OrganiserApp = lazy(() => import('./organiser/organiser-app'))

export function App() {
  const [location] = useLocation()

  return (
    <Shell>
      <RouteBoundary reset_key={location}>
        <Switch>
          <Route path="/">
            <Welcome />
          </Route>
          <Route path="/login">
            <Login />
          </Route>
          <Route path="/family">
            <Welcome />
          </Route>
          <Route path="/organiser" nest>
            <Suspense fallback={<RouteLoading />}>
              <OrganiserApp />
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
