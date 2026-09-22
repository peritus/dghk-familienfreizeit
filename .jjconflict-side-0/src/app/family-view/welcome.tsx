import { Card, CardContent, CardHeader } from '../components/ui/card'

export function Welcome() {
  return (
    <Card className="mx-auto max-w-xl bg-white">
      <CardHeader>
        <h1 className="text-2xl">Willkommen zur Familienfreizeit</h1>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Hier findest Du bald die Angaben und Informationen für Deine Familie.</p>
        <p>
          Die Anmeldung ist noch nicht freigeschaltet. Das Organisationsteam informiert Dich, sobald
          es losgeht.
        </p>
      </CardContent>
    </Card>
  )
}
