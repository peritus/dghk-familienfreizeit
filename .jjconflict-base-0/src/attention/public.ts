import { composeAttention } from './engine.js'
import { check, fact } from './helpers.js'
const declarations = [
  [
    'login-expired',
    'Der Link ist abgelaufen',
    'The link has expired',
    'Fordere einen neuen Magic Link an.',
    'Request a new magic link.',
  ],
  [
    'login-response',
    'Anfrage bearbeitet',
    'Request processed',
    'Wenn ein Zugang für diese Adresse verfügbar ist, kannst Du den Anmeldelink verwenden.',
    'If access is available for this address, you can use its sign-in link.',
  ],
  [
    'login-failed',
    'Anfrage fehlgeschlagen',
    'Request failed',
    'Bitte versuche es später erneut.',
    'Please try again later.',
  ],
  [
    'login-demo',
    'Demo-Magic-Link bereit',
    'Demo magic link ready',
    'Klicke auf den Link, um Dich als Organisator anzumelden.',
    'Follow the link to sign in as an organiser.',
  ],
  [
    'route-failed',
    'Ansicht nicht verfügbar',
    'View unavailable',
    'Bitte lade die Seite neu. Deine gespeicherten Angaben bleiben erhalten.',
    'Please reload. Your saved information remains available.',
  ],
] as const
export const publicAttentionChecks = declarations.map(([code, de, en, detailDe, detailEn]) =>
  check(
    `operation.${code}`,
    'core',
    [de, en],
    (c) => (c.operations ?? []).filter((o) => o.code === code).map((o) => fact(c, [o.id], [], {})),
    {
      requires: [],
      areas: ['operations'],
      scopes: ['operation'],
      audiences: ['shared'],
      severity: code === 'login-failed' || code === 'route-failed' ? 'error' : 'info',
      kind: code === 'login-failed' || code === 'route-failed' ? 'problem' : 'status',
      detail: () => ({ de: detailDe, en: detailEn }),
    },
  ),
)
const evaluate = composeAttention(publicAttentionChecks)
export function derivePublicAttention(code: (typeof declarations)[number][0], locale = 'de') {
  return evaluate({
    domain: 'available',
    world: null,
    plan: null,
    profile: {
      meta: { locale, fallback_locale: 'en' },
      modules: [],
      traits: {},
      validation_view: {},
    },
    build_revision: 'public',
    locale,
    now: '1970-01-01T00:00:00.000Z',
    audience: 'shared',
    operations: [{ id: 'public-session', code }],
  }).items[0]!
}
