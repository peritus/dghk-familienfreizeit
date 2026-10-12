import { composeAttention } from './engine.js'
import type { AttentionContext } from './types.js'
import { check, fact } from './helpers.js'
const definitions = [
  ['loading', 'Daten werden geladen', 'Loading data', 'status', 'info'],
  ['saving', 'Änderungen werden gespeichert', 'Saving changes', 'status', 'info'],
  [
    'drafts',
    'Änderungsentwürfe noch nicht gespeichert',
    'Draft changes not saved yet',
    'status',
    'info',
  ],
  ['saved', 'Änderungen gespeichert', 'Changes saved', 'status', 'info'],
  [
    'load-failed',
    'Daten konnten nicht geladen werden',
    'Data could not be loaded',
    'problem',
    'error',
  ],
  ['unauthorized', 'Bitte erneut anmelden', 'Please sign in again', 'problem', 'error'],
  [
    'stale-head',
    'Gemeinsame Daten geändert; Entwürfe prüfen',
    'Shared data changed; review drafts',
    'problem',
    'warning',
  ],
  ['stale-build', 'Ansicht veraltet; neu laden', 'Outdated view; reload', 'problem', 'error'],
  ['apply-failed', 'Änderungen nicht gespeichert', 'Changes not saved', 'problem', 'error'],
  ['invalid-field', 'Angabe prüfen', 'Review field', 'problem', 'error'],
  [
    'confidential',
    'Vertrauliche Organisationsdaten',
    'Confidential organiser data',
    'information',
    'info',
  ],
  [
    'prospective',
    'Vorschau der Änderungsentwürfe',
    'Preview of draft changes',
    'information',
    'info',
  ],
  [
    'route-failed',
    'Ansicht konnte nicht angezeigt werden',
    'View could not be displayed',
    'problem',
    'error',
  ],
] as const
export const operationalAttentionChecks = definitions.map(([code, de, en, kind, severity]) =>
  check(
    `operation.${code}`,
    'core',
    [de, en],
    (c) =>
      (code === 'apply-failed' && c.rejected_findings?.length ? [] : (c.operations ?? []))
        .filter((o) => o.code === code && !o.validation_code)
        .map((o) =>
          fact(
            c,
            [o.id, o.group_id ?? null, o.field ?? null],
            [],
            { operation_id: o.id, group_id: o.group_id ?? null, field: o.field ?? null },
            {
              sources: [
                { kind: 'operation', id: o.id },
                ...(o.field
                  ? [{ kind: 'field' as const, field: o.field, group_id: o.group_id ?? null }]
                  : []),
              ],
              actions: o.group_id
                ? [{ kind: 'review-group', group_id: o.group_id }]
                : code === 'unauthorized'
                  ? [{ kind: 'login' }]
                  : ['load-failed', 'stale-build', 'route-failed'].includes(code)
                    ? [{ kind: 'reload' }]
                    : code === 'apply-failed'
                      ? [{ kind: 'retry' }]
                      : [],
            },
          ),
        ),
    {
      requires: [],
      areas: ['operations'],
      scopes: ['operation'],
      kind,
      severity,
      detail: () =>
        code === 'stale-build'
          ? {
              de: 'Diese Ansicht ist veraltet. Bitte lade sie neu.',
              en: 'This view is outdated. Please reload.',
            }
          : code === 'load-failed'
            ? {
                de: 'Die Organisationsdaten konnten nicht geladen werden.',
                en: 'The organiser data could not be loaded.',
              }
            : { de, en },
    },
  ),
)

const evaluateOperation = composeAttention(operationalAttentionChecks)
export function operationFeedback(
  code: NonNullable<AttentionContext['operations']>[number]['code'],
  locale = 'de',
) {
  return evaluateOperation({
    domain: 'available',
    world: null,
    plan: null,
    profile: {
      meta: { locale, fallback_locale: 'en' },
      modules: [],
      traits: {},
      validation_view: {},
    },
    build_revision: 'operations',
    locale,
    now: '1970-01-01T00:00:00Z',
    audience: 'organiser',
    operations: [{ id: 'session', code }],
  }).items[0]!
}
