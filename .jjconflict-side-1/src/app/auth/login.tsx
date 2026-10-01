import { useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { Button } from '../components/shared/ui/button'
import { Card, CardContent, CardHeader } from '../components/shared/ui/card'

type LoginStatus = 'idle' | 'sending' | 'sent' | 'error'

function expiredLink(): boolean {
  return new URLSearchParams(window.location.search).get('error') === 'expired'
}

export function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<LoginStatus>('idle')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error('login request failed')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <Card className="mx-auto max-w-xl bg-white">
      <CardHeader>
        <p className="text-sm font-bold uppercase tracking-wide">Zugang</p>
        <h1 className="text-2xl">Mit Magic Link anmelden</h1>
      </CardHeader>
      <CardContent className="space-y-5">
        {expiredLink() ? (
          <Alert variant="destructive">
            <AlertTitle>Der Link ist abgelaufen</AlertTitle>
            <AlertDescription>Fordere einen neuen Magic Link an.</AlertDescription>
          </Alert>
        ) : null}
        {status === 'sent' ? (
          <Alert>
            <AlertTitle>Magic Link angefordert</AlertTitle>
            <AlertDescription>
              <p>Prüfe Dein Postfach und öffne den Link.</p>
              <p>
                In der lokalen Entwicklung wird der Link im Worker-Terminal ausgegeben. Kopiere ihn
                von dort in den Browser.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
        {status === 'error' ? (
          <Alert variant="destructive">
            <AlertTitle>Anfrage fehlgeschlagen</AlertTitle>
            <AlertDescription>Bitte versuche es später erneut.</AlertDescription>
          </Alert>
        ) : null}
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1">
            E-Mail-Adresse
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11 rounded border-2 border-black px-3"
            />
          </label>
          <Button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Wird angefordert …' : 'Magic Link anfordern'}
          </Button>
        </form>
        <Link href="~/" className="underline">
          Zur Startseite
        </Link>
      </CardContent>
    </Card>
  )
}
