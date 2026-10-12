import { subjectName } from './closed-areas.js'
import { useState } from 'react'
import type { EventDraft, JsonValue } from '../../events/types.js'
import { Button } from '../components/shared/ui/button.js'
import { TextField } from '../components/shared/ui/field.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/shared/ui/dialog.js'
import { useOrganiser } from './context.js'
const names: Readonly<Record<string, string>> = {
  leader_ids: 'Leitung',
  availability: 'Verfügbarer Slot',
  needs: 'Anforderung',
  title: 'Titel',
  description: 'Beschreibung',
  audience: 'Zielgruppe',
  age_min: 'Mindestalter',
  age_max: 'Höchstalter',
  capacity: 'Plätze',
  participation_mode: 'Teilnahmeart',
  name: 'Name',
  given_name: 'Vorname',
  family_name: 'Nachname',
  age: 'Alter',
  role: 'Rolle',
  display_name: 'Familienname',
  email: 'E-Mail-Adresse',
  number: 'Zimmernummer',
  floor: 'Etage',
  room_type: 'Zimmerart',
  label: 'Bezeichnung',
  bed_type: 'Bettart',
  sleeps: 'Schlafplätze',
  sleeping_room: 'Schlafraum',
  starts_at: 'Beginn',
  ends_at: 'Ende',
  value: 'Angabe',
  rank: 'Wahlrunde',
  strength: 'Wichtigkeit',
  note: 'Notiz',
  location_description: 'Lage',
}
function edit(value: JsonValue, path: readonly string[], replacement: JsonValue): JsonValue {
  if (!path.length) return replacement
  if (value === null || typeof value !== 'object') return value
  const key = path[0]!
  if (Array.isArray(value))
    return value.map((entry, index) =>
      String(index) === key ? edit(entry, path.slice(1), replacement) : entry,
    )
  return { ...value, [key]: edit(value[key] ?? null, path.slice(1), replacement) }
}

function fields(
  value: JsonValue,
  path: readonly string[] = [],
): { path: readonly string[]; label: string; value: string | number | boolean | null }[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).flatMap(([key, entry]) => {
    if (typeof entry === 'string' && entry.startsWith('fixed-workshop:')) return []
    if (key.endsWith('_id') || key === 'sort_key' || key === 'key') return []
    if (Array.isArray(entry))
      return entry.flatMap((item, index) =>
        typeof item === 'string' || typeof item === 'number'
          ? [
              {
                path: [...path, key, String(index)],
                label: `${names[key] ?? 'Verweis'} ${index + 1}`,
                value: item,
              },
            ]
          : fields(item, [...path, key, String(index)]),
      )
    if (entry !== null && typeof entry === 'object') return fields(entry, [...path, key])
    return names[key] && (entry === null || ['string', 'number', 'boolean'].includes(typeof entry))
      ? [{ path: [...path, key], label: names[key], value: entry }]
      : []
  })
}
export function DraftGroupEditor({
  group_id: groupId,
  onClose,
}: {
  group_id: string
  onClose: () => void
}) {
  const { state, dispatch, world, baseline_world: baselineWorld } = useOrganiser(),
    group = state.drafts.find((g) => g.id === groupId)
  const [drafts, setDrafts] = useState<readonly EventDraft[]>(group?.events ?? [])
  const locked = state.submitted_groups?.includes(groupId) ?? false
  const namesWorld = world ?? baselineWorld
  const numbers = new Set([
    'capacity',
    'age',
    'age_min',
    'age_max',
    'rank',
    'sleeps',
    'sleeping_room',
  ])
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Änderungsgruppe prüfen</DialogTitle>
          <DialogDescription>
            Diese Änderungen gehören zusammen. Andere Änderungsgruppen bleiben erhalten.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {drafts.map((event, index) => (
            <fieldset key={index} disabled={locked}>
              <legend className="font-bold">Änderung {index + 1}</legend>
              {fields(event.payload).map((field) =>
                typeof field.value === 'string' &&
                /^(fam|per|wks|wsp|slot|rm|bed|plc|ext)_/.test(field.value) &&
                namesWorld ? (
                  <label key={field.path.join('.')}>
                    {field.label}
                    <select
                      value={field.value}
                      onChange={(change) =>
                        setDrafts((values) =>
                          values.map((value, i) =>
                            i === index
                              ? {
                                  ...value,
                                  payload: edit(value.payload, field.path, change.target.value),
                                }
                              : value,
                          ),
                        )
                      }
                    >
                      <option value={field.value}>
                        {namesWorld.entity_kind_by_id[field.value]
                          ? subjectName(namesWorld, field.value)
                          : 'Verweis nicht verfügbar'}
                      </option>
                      {Object.values(namesWorld.entities_by_kind)
                        .flat()
                        .filter(
                          (entity) =>
                            !namesWorld.entity_kind_by_id[String(field.value)] ||
                            entity.kind === namesWorld.entity_kind_by_id[String(field.value)],
                        )
                        .map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {subjectName(namesWorld, entity.id)}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : typeof field.value === 'boolean' ? (
                  <label key={field.path.join('.')}>
                    {field.label}
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(change) =>
                        setDrafts((values) =>
                          values.map((value, i) =>
                            i === index
                              ? {
                                  ...value,
                                  payload: edit(value.payload, field.path, change.target.checked),
                                }
                              : value,
                          ),
                        )
                      }
                    />
                  </label>
                ) : (
                  <TextField
                    key={field.path.join('.')}
                    label={field.label}
                    type={
                      typeof field.value === 'number' || numbers.has(field.path.at(-1) ?? '')
                        ? 'number'
                        : 'text'
                    }
                    value={field.value === null ? '' : String(field.value)}
                    onChange={(change) => {
                      const replacement =
                        typeof field.value === 'number' || numbers.has(field.path.at(-1) ?? '')
                          ? change.target.value === ''
                            ? null
                            : Number(change.target.value)
                          : field.value === null && !change.target.value
                            ? null
                            : change.target.value
                      setDrafts((values) =>
                        values.map((value, i) =>
                          i === index
                            ? { ...value, payload: edit(value.payload, field.path, replacement) }
                            : value,
                        ),
                      )
                    }}
                  />
                ),
              )}
            </fieldset>
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="neutral">Behalten</Button>} />
          <Button
            disabled={locked}
            variant="danger"
            onClick={() => {
              dispatch({ type: 'discard-group', group_id: groupId })
              onClose()
            }}
          >
            Gruppe verwerfen
          </Button>
          <Button
            disabled={locked}
            onClick={() => {
              dispatch({ type: 'replace-group', group_id: groupId, events: drafts })
              onClose()
            }}
          >
            Korrektur übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
