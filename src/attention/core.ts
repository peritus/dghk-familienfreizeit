import { check, fact } from './helpers.js'
import type { AttentionCheck } from './types.js'
const definitions = [
 ['kernel.unknown-trait', 'Unbekanntes Merkmal', 'Unknown label'],
 ['kernel.scope-violation', 'Merkmal am falschen Objekt', 'Label on the wrong entity'],
 ['kernel.valid-for', 'Merkmal passt nicht zu den Daten', 'Label does not apply to these facts'],
 ['kernel.invalid-resolver-value', 'Ungültiger Beziehungswert', 'Invalid relationship value'],
 ['kernel.dangling-reference', 'Verweis nicht mehr verfügbar', 'Referenced entity unavailable'],
 ['kernel.cardinality', 'Anzahl der Merkmalswerte prüfen', 'Review number of label values'],
 ['kernel.contradiction', 'Widersprüchliche Anforderungen', 'Contradictory requirements'],
] as const
export const coreAttentionChecks: readonly AttentionCheck[] = [
 ...definitions.map(([code, de, en]) => check(code, 'core', [de, en], context => context.world!.diagnostics.filter(d => d.id === code).map(d => {
   const e = d.evidence ?? {}; const key = [d.subject_id, e.key ?? e.target ?? null, ...(code === 'kernel.invalid-resolver-value' ? [e.value ?? null] : [])]
   return fact(context, key, [d.subject_id], e, { severity: d.severity, sources: [{ kind: 'resolver', code }, ...(typeof e.key === 'string' && typeof e.seq === 'number' ? [{ kind: 'label' as const, entity_id: d.subject_id, key: e.key, value: e.value ?? null, seq: e.seq }] : [])], blocks: ['kernel.dangling-reference', 'kernel.cardinality'].includes(code) ? ['append'] : [], actions: code === 'kernel.unknown-trait' && typeof e.key === 'string' && typeof e.seq === 'number' ? [{ kind: 'clear-label', entity_id: d.subject_id, key: e.key, value: e.value ?? null, seq: e.seq }] : [] })
 }))),
 check('kernel.family-without-persons', 'core', ['Familie ohne Personen', 'Family without people'], context => context.world!.families.filter(f => !(context.world!.labels_by_key['member-of'] ?? []).some(l => l.value === f.id)).map(f => fact(context, [f.id], [f.id], {}, { actions: [{ kind: 'navigate', destination: 'family', entity_id: f.id }] })), { scopes: ['dashboard', 'family'] }),
 check('kernel.child-age-missing', 'core', ['Alter eines Kindes fehlt', 'Child age missing'], context => context.world!.persons.filter(p => { const labels = context.world!.labels_by_entity[p.id] ?? []; return labels.some(l => l.key === 'role' && l.value === 'child') && !labels.some(l => l.key === 'age' && typeof l.value === 'number') }).map(p => fact(context, [p.id, 'age'], [p.id], { field: 'age' })), { scopes: ['dashboard', 'family'] }),
]
