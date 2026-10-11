import { derivePublicAttention } from '../../attention/public.js'
import { TextField } from '../components/shared/ui/field.js'
import { ScreenLayout, ScreenHeader } from '../components/shared/ui/screen-layout.js'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { Button } from '../components/shared/ui/button'
import { Card, CardContent } from '../components/shared/ui/card'

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
    <ScreenLayout
      header={<ScreenHeader eyebrow="Zugang" title="Anmelden" />}
      notices={
        <div className="max-w-xl space-y-4">
          {expiredLink() ? (
            <Alert variant="destructive">
              <AlertTitle>{derivePublicAttention('login-expired').wording.title}</AlertTitle>
              <AlertDescription>
                {derivePublicAttention('login-expired').wording.detail}
              </AlertDescription>
            </Alert>
          ) : null}
          {status === 'sent' && magicLink ? (
            <Alert aria-live="polite" className="bg-main text-main-foreground">
              <AlertTitle>{derivePublicAttention('login-demo').wording.title}</AlertTitle>
              <AlertDescription>
                <p>{derivePublicAttention('login-demo').wording.detail}</p>
                <a
                  href={magicLink}
                  className="inline-flex min-h-11 items-center rounded-base border-2 border-border bg-secondary-background px-4 py-2 font-bold text-foreground shadow-shadow"
                >
                  Anmelden
                </a>
              </AlertDescription>
            </Alert>
          ) : null}
          {status === 'sent' && !magicLink ? (
            <Alert aria-live="polite">
              <AlertTitle>{derivePublicAttention('login-response').wording.title}</AlertTitle>
              <AlertDescription>
                <p>{derivePublicAttention('login-response').wording.detail}</p>
              </AlertDescription>
            </Alert>
          ) : null}
          {status === 'error' ? (
            <Alert variant="destructive">
              <AlertTitle>{derivePublicAttention('login-failed').wording.title}</AlertTitle>
              <AlertDescription>
                {derivePublicAttention('login-failed').wording.detail}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      }
    >
      <Card className="max-w-xl bg-secondary-background">
        <CardContent className="space-y-5">
          {status === 'sent' && magicLink ? null : (
            <form onSubmit={submit} className="grid gap-4">
              <TextField
                label="E-Mail-Adresse"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
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
    </ScreenLayout>
  )
}
