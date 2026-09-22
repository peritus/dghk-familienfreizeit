import { lazy, Suspense, useEffect } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { Shell } from './components/shell'
import { NotFound, RouteBoundary, RouteLoading } from './components/route-states'
import { Welcome } from './family-view/welcome'

const OrganiserApp = lazy(() => import('./organiser/organiser-app'))

export function App() {
  const [location] = useLocation()
  useEffect(() => {
    document.getElementById('content')?.focus()
  }, [location])

  return (
    <Shell>
      <RouteBoundary key={location}>
        <Switch>
          <Route path="/">
            <Welcome />
          </Route>
          <Route path="/login">
            <Welcome />
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
