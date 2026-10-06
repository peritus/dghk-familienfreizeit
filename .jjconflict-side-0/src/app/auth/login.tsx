import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { Button } from '../components/shared/ui/button'
import { Card, CardContent, CardHeader } from '../components/shared/ui/card'

type LoginStatus = 'idle' | 'sending' | 'sent' | 'error'
const resendCooldownSeconds = 60

function expiredLink(): boolean {
  return new URLSearchParams(window.location.search).get('error') === 'expired'
}

export function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<LoginStatus>('idle')
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [magicLink, setMagicLink] = useState<string | null>(null)

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const timer = window.setInterval(() => {
      setCooldownRemaining((remaining) => Math.max(0, remaining - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownRemaining])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (cooldownRemaining > 0) return
    setStatus('sending')
    setMagicLink(null)
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error('login request failed')
      const body = (await response.json()) as { magic_link?: unknown }
      setMagicLink(typeof body.magic_link === 'string' ? body.magic_link : null)
      setStatus('sent')
      setCooldownRemaining(resendCooldownSeconds)
    } catch {
      setStatus('error')
    }
  }

  return (
    <Card className="mx-auto max-w-xl bg-secondary-background">
      <CardHeader>
        <p className="text-sm font-bold uppercase tracking-wide">Zugang</p>
        <h1 className="text-2xl">Als Organisator anmelden</h1>
      </CardHeader>
      <CardContent className="space-y-5">
        {expiredLink() ? (
          <Alert variant="destructive">
            <AlertTitle>Der Link ist abgelaufen</AlertTitle>
            <AlertDescription>Fordere einen neuen Magic Link an.</AlertDescription>
          </Alert>
        ) : null}
        {status === 'sent' && magicLink ? (
          <Alert aria-live="polite" className="bg-main text-main-foreground">
            <AlertTitle>Demo-Magic-Link bereit</AlertTitle>
            <AlertDescription>
              <p>Klicke auf den Link, um Dich als Organisator anzumelden.</p>
              <a
                href={magicLink}
                className="inline-flex min-h-11 items-center rounded-base border-2 border-border bg-secondary-background px-4 py-2 font-bold text-foreground shadow-shadow"
              >
                Als Organisator anmelden
              </a>
            </AlertDescription>
          </Alert>
        ) : null}
        {status === 'sent' && !magicLink ? (
          <Alert aria-live="polite">
            <AlertTitle>Magic Link gesendet</AlertTitle>
            <AlertDescription>
              <p>Bitte prüfe Dein Postfach und öffne den Link.</p>
            </AlertDescription>
          </Alert>
        ) : null}
        {status === 'error' ? (
          <Alert variant="destructive">
            <AlertTitle>Anfrage fehlgeschlagen</AlertTitle>
            <AlertDescription>Bitte versuche es später erneut.</AlertDescription>
          </Alert>
        ) : null}
        {status === 'sent' && magicLink ? null : (
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-1">
              E-Mail-Adresse
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 rounded border-2 border-border px-3"
              />
            </label>
            <Button type="submit" disabled={status === 'sending' || cooldownRemaining > 0}>
              {status === 'sending'
                ? 'Wird angefordert …'
                : cooldownRemaining > 0
                  ? `Erneut anfordern in ${cooldownRemaining} s`
                  : 'Magic Link anfordern'}
            </Button>
          </form>
        )}
        <Link href="~/" className="underline">
          Zur Startseite
        </Link>
      </CardContent>
    </Card>
  )
}
