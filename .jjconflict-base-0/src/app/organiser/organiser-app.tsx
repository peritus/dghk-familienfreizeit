import { Route, Switch } from 'wouter'
import { NotFound } from '../components/route-states'
import { Card, CardContent, CardHeader } from '../components/ui/card'

export default function OrganiserApp() {
  return (
    <Switch>
      <Route path="/">
        <Card className="bg-white">
          <CardHeader><h1 className="text-2xl">Ansicht des Organisationsteams</h1></CardHeader>
          <CardContent>
            <p>Die Verwaltungsfunktionen werden vorbereitet. Hier sind noch keine Familiendaten verfügbar.</p>
          </CardContent>
        </Card>
      </Route>
      <Route><NotFound /></Route>
    </Switch>
  )
}
