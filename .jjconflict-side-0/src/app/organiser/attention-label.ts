import type { AttentionItem } from '../../attention/types.js'
import type { World } from '../../events/fold.js'
import { subjectName } from './closed-areas.js'
/** Presentation of the canonical wording with live, authorized entity names. */
export function attentionLabel(item: AttentionItem, world: World | null, omitSubjectId?: string) {
  const names = item.subjects
    .filter((subject) => subject.id !== omitSubjectId)
    .map((subject) => (world ? subjectName(world, subject.id) : 'Objekt nicht verfügbar'))
  return [
    item.wording.title,
    ...names.slice(0, 3),
    ...(names.length > 3 ? [`${names.length - 3} weitere`] : []),
  ].join(' · ')
}
