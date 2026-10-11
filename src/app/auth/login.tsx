import { derivePublicAttention } from '../../attention/public.js'
import { TextField } from '../components/shared/ui/field.js'
import { ScreenLayout, ScreenHeader } from '../components/shared/ui/screen-layout.js'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import type { ProfilePresentation } from '../../config/presentation.js'
import { loginCopy } from './wording.js'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { Button } from '../components/shared/ui/button'
import { Card, CardContent } from '../components/shared/ui/card'

type LoginStatus = 'idle' | 'sending' | 'sent' | 'error'
const resendCooldownSeconds = 60

function expiredLink(): boolean {
  return new URLSearchParams(window.location.search).get('error') === 'expired'
}

function LoginForm({ locale }: { locale: string }) {
  const copy = loginCopy(locale)
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
      header={<ScreenHeader eyebrow={copy.access} title={copy.sign_in} />}
      notices={
        <div className="max-w-xl space-y-4">
          {expiredLink() ? (
            <Alert variant="destructive">
              <AlertTitle>
                {derivePublicAttention('login-expired', locale).wording.title}
              </AlertTitle>
              <AlertDescription>
                {derivePublicAttention('login-expired', locale).wording.detail}
              </AlertDescription>
            </Alert>
          ) : null}
          {status === 'sent' && magicLink ? (
            <Alert aria-live="polite" className="bg-main text-main-foreground">
              <AlertTitle>{derivePublicAttention('login-demo', locale).wording.title}</AlertTitle>
              <AlertDescription>
                <p>{derivePublicAttention('login-demo', locale).wording.detail}</p>
                <a
                  href={magicLink}
                  className="inline-flex min-h-11 items-center rounded-base border-2 border-border bg-secondary-background px-4 py-2 font-bold text-foreground shadow-shadow"
                >
                  {copy.sign_in}
                </a>
              </AlertDescription>
            </Alert>
          ) : null}
          {status === 'sent' && !magicLink ? (
            <Alert aria-live="polite">
              <AlertTitle>
                {derivePublicAttention('login-response', locale).wording.title}
              </AlertTitle>
              <AlertDescription>
                <p>{derivePublicAttention('login-response', locale).wording.detail}</p>
              </AlertDescription>
            </Alert>
          ) : null}
          {status === 'error' ? (
            <Alert variant="destructive">
              <AlertTitle>{derivePublicAttention('login-failed', locale).wording.title}</AlertTitle>
              <AlertDescription>
                {derivePublicAttention('login-failed', locale).wording.detail}
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
                label={copy.email}
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" disabled={status === 'sending' || cooldownRemaining > 0}>
                {status === 'sending'
                  ? copy.sending
                  : cooldownRemaining > 0
                    ? copy.resend(cooldownRemaining)
                    : copy.request_link}
              </Button>
            </form>
          )}
          <Link href="~/" className="underline">
            {copy.home}
          </Link>
        </CardContent>
      </Card>
    </ScreenLayout>
  )
}

export function Login({ profile }: { profile?: ProfilePresentation }) {
  const [, navigate] = useLocation()
  const [identity, setIdentity] = useState<'loading' | 'anonymous' | 'failed' | readonly string[]>(
    'loading',
  )
  const [attempt, setAttempt] = useState(0)
  const copy = loginCopy(profile?.meta.locale ?? 'de')
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/me', { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          if (!controller.signal.aborted) setIdentity('anonymous')
          return
        }
        if (!response.ok) throw new Error('identity unavailable')
        const body = (await response.json()) as { principal?: { roles?: unknown } }
        if (!Array.isArray(body.principal?.roles)) throw new Error('invalid identity')
        const roles = [
          ...new Set(
            body.principal.roles.filter(
              (role: unknown) => role === 'family' || role === 'organiser',
            ),
          ),
        ] as string[]
        if (controller.signal.aborted) return
        setIdentity(roles.length ? roles : 'anonymous')
        if (roles.length === 1) void navigate(roles[0] === 'family' ? '/family' : '/organiser')
      })
      .catch(() => {
        if (!controller.signal.aborted) setIdentity('failed')
      })
    return () => controller.abort()
  }, [navigate, attempt])
  if (identity === 'anonymous') return <LoginForm locale={profile?.meta.locale ?? 'de'} />
  if (identity === 'failed')
    return (
      <ScreenLayout header={<ScreenHeader title={copy.sign_in} />}>
        <p role="alert">{copy.failed}</p>
        <Button
          type="button"
          onClick={() => {
            setIdentity('loading')
            setAttempt((value) => value + 1)
          }}
        >
          {copy.retry}
        </Button>
      </ScreenLayout>
    )
  if (identity === 'loading' || identity.length === 1)
    return (
      <ScreenLayout header={<ScreenHeader title={copy.sign_in} />}>
        <p role="status" aria-busy="true">
          {copy.loading}
        </p>
      </ScreenLayout>
    )
  return (
    <ScreenLayout header={<ScreenHeader title={copy.choose} description={copy.explanation} />}>
      <nav aria-label={copy.choices_label} className="grid gap-4 sm:grid-cols-2">
        {identity.includes('family') ? (
          <Link
            href="/family"
            className="grid min-h-20 content-center rounded-base border-2 border-border bg-secondary-background p-5 font-bold shadow-shadow"
          >
            {copy.family}
          </Link>
        ) : null}
        {identity.includes('organiser') ? (
          <Link
            href="/organiser"
            className="grid min-h-20 content-center rounded-base border-2 border-border bg-secondary-background p-5 font-bold shadow-shadow"
          >
            {copy.organiser}
          </Link>
        ) : null}
      </nav>
    </ScreenLayout>
  )
}
