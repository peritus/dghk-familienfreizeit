import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/shared/ui/alert-dialog.js'
import { Button } from '../../../components/shared/ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/shared/ui/card.js'
import { WorkshopField } from '../../../components/shared/workshop/shared.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/shared/ui/dialog.js'

const controlClass = 'min-h-11 rounded-base border-2 border-black px-3 font-normal'

export function WorkshopSelectField({
  label,
  name,
  default_value: defaultValue,
  children,
  hint,
}: {
  label: string
  name: string
  default_value?: string
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <label className="grid gap-1 font-bold">
      {label}
      <select name={name} defaultValue={defaultValue} className={controlClass}>
        {children}
      </select>
      {hint ? <span className="text-sm font-normal text-muted">{hint}</span> : null}
    </label>
  )
}

export function WorkshopTextareaField({
  label,
  name,
  default_value: defaultValue,
  hint,
}: {
  label: string
  name: string
  default_value?: string
  hint?: ReactNode
}) {
  return (
    <label className="grid gap-1 font-bold">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        className={`${controlClass} min-h-24 py-2`}
      />
      {hint ? <span className="text-sm font-normal text-muted">{hint}</span> : null}
    </label>
  )
}

export function WorkshopCheckboxGroup({
  legend,
  options,
  default_values: defaultValues = [],
}: {
  legend: string
  options: readonly { value: string; label: string }[]
  default_values?: readonly string[]
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="font-bold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 items-center gap-2 rounded-base border-2 border-black bg-white px-3"
          >
            <input
              type="checkbox"
              name="capabilities"
              value={option.value}
              defaultChecked={defaultValues.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function WorkshopLeaderPicker({
  leaders,
  selected_ids: selectedIds = [],
}: {
  leaders: readonly { id: string; label: string; external?: boolean }[]
  selected_ids?: readonly string[]
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<readonly string[]>(selectedIds)
  const normalizedQuery = query.trim().toLocaleLowerCase('de-DE')
  const visibleLeaders = useMemo(
    () =>
      leaders.filter((leader) => leader.label.toLocaleLowerCase('de-DE').includes(normalizedQuery)),
    [leaders, normalizedQuery],
  )
  const groups = [
    { label: 'Interne Leitungen', external: false },
    { label: 'Externe Leitungen', external: true },
  ]
  return (
    <fieldset className="grid gap-2 sm:col-span-2">
      <legend className="font-bold">Leitungen</legend>
      <p className="text-sm font-normal text-muted" id="workshop-leader-hint">
        Suche nach Personen aus der Veranstaltung oder bereits angelegten externen Leitungen.
      </p>
      <input
        type="search"
        aria-label="Leitungen durchsuchen"
        placeholder="Leitung suchen …"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={controlClass}
      />
      <div
        aria-describedby="workshop-leader-hint"
        className="grid max-h-56 gap-3 overflow-y-auto rounded-base border-2 border-black bg-white p-3"
      >
        {groups.map((group) => {
          const groupLeaders = visibleLeaders.filter(
            (leader) => Boolean(leader.external) === group.external,
          )
          if (!groupLeaders.length) return null
          return (
            <div key={group.label} className="grid gap-2">
              <p className="text-sm font-bold text-muted">{group.label}</p>
              {groupLeaders.map((leader) => (
                <label key={leader.id} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    name="leader_ids"
                    value={leader.id}
                    checked={selected.includes(leader.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, leader.id]
                          : current.filter((id) => id !== leader.id),
                      )
                    }
                  />
                  <span>
                    {leader.label}
                    {leader.external ? ' (extern)' : ''}
                  </span>
                </label>
              ))}
            </div>
          )
        })}
        {!visibleLeaders.length ? (
          <p className="text-sm text-muted">Keine Leitung gefunden.</p>
        ) : null}
      </div>
    </fieldset>
  )
}

export type WorkshopEditorValues = {
  title?: string
  description?: string
  audience?: string
  capacity?: number
  participation_mode?: string
  age_min?: number
  age_max?: number
  needs?: string
}

function WorkshopEditorFields({
  default_values: defaultValues,
  children,
}: {
  default_values: WorkshopEditorValues
  children?: ReactNode
}) {
  return (
    <>
      <WorkshopField label="Titel" name="title" defaultValue={defaultValues.title} required />
      <WorkshopSelectField
        label="Zielgruppe"
        name="audience"
        default_value={defaultValues.audience ?? 'all'}
      >
        <option value="all">Alle</option>
        <option value="children">Kinder</option>
        <option value="adults">Erwachsene</option>
      </WorkshopSelectField>
      <div className="sm:col-span-2">
        <WorkshopTextareaField
          label="Beschreibung für Familien"
          name="description"
          default_value={defaultValues.description}
        />
      </div>
      <WorkshopField
        label="Alter ab"
        name="age_min"
        type="number"
        min="0"
        max="120"
        defaultValue={defaultValues.age_min ?? 0}
      />
      <WorkshopField
        label="Alter bis"
        name="age_max"
        type="number"
        min="0"
        max="120"
        defaultValue={defaultValues.age_max ?? 120}
      />
      <WorkshopField
        label="Plätze"
        name="capacity"
        type="number"
        min="0"
        max="200"
        defaultValue={defaultValues.capacity ?? 8}
        hint="Leitungen zählen nicht mit."
      />
      <WorkshopSelectField
        label="Teilnahme"
        name="participation_mode"
        default_value={defaultValues.participation_mode ?? 'assigned'}
      >
        <option value="assigned">Zuordnung</option>
        <option value="sign-up">Anmeldung</option>
        <option value="interest">Interesse</option>
      </WorkshopSelectField>
      <div className="sm:col-span-2">
        <WorkshopField
          label="Benötigt"
          name="needs"
          defaultValue={defaultValues.needs}
          hint="Mehrere Fähigkeiten mit Komma trennen; die Prüfung erfolgt über den Resolver."
        />
      </div>
      {children}
    </>
  )
}

export function WorkshopEditorForm({
  default_values: defaultValues = {},
  on_submit: onSubmit,
  submit_label: submitLabel = 'Workshop speichern',
  children,
}: {
  default_values?: WorkshopEditorValues
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
  children?: ReactNode
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Workshopdaten</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <WorkshopEditorFields default_values={defaultValues}>{children}</WorkshopEditorFields>
          <div className="sm:col-span-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function WorkshopEditorDialog({
  open,
  on_open_change: onOpenChange,
  default_values: defaultValues = {},
  on_submit: onSubmit,
  submit_label: submitLabel = 'Übernehmen',
  error,
  children,
}: {
  open: boolean
  on_open_change: (open: boolean) => void
  default_values?: WorkshopEditorValues
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
  error?: ReactNode
  children?: ReactNode
}) {
  const formId = useId()
  const title = defaultValues.title
    ? `Workshop bearbeiten: ${defaultValues.title}`
    : 'Workshop hinzufügen'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Beschreibung, Zielgruppe und Rahmen für diesen Workshop festlegen.
          </DialogDescription>
          {error ? (
            <p role="alert" className="rounded-base border-2 border-black bg-danger p-3">
              {error}
            </p>
          ) : null}
        </DialogHeader>
        <form id={formId} className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <WorkshopEditorFields default_values={defaultValues}>{children}</WorkshopEditorFields>
        </form>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="neutral">
                Abbrechen
              </Button>
            }
          />
          <Button type="submit" form={formId}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type ExternalLeaderEditorValues = {
  name?: string
  phone?: string
  availability?: readonly string[]
}

export function ExternalLeaderEditorForm({
  default_values: defaultValues = {},
  slots = [],
  on_submit: onSubmit,
  submit_label: submitLabel = 'Externe Leitung speichern',
}: {
  default_values?: ExternalLeaderEditorValues
  slots?: readonly { value: string; label: string }[]
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Externe Leitung</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <WorkshopField label="Name" name="name" defaultValue={defaultValues.name} required />
          <WorkshopField
            label="Telefon"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
            hint="Nur für die Organisation sichtbar."
          />
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="font-bold">Verfügbar</legend>
            <p className="text-sm font-normal text-muted">
              Wähle die Slots, in denen die externe Leitung einen Workshop übernehmen kann.
            </p>
            {slots.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {slots.map((slot) => (
                  <label
                    key={slot.value}
                    className="flex min-h-11 items-center gap-2 rounded-base border-2 border-black bg-white px-3"
                  >
                    <input
                      type="checkbox"
                      name="availability"
                      value={slot.value}
                      defaultChecked={defaultValues.availability?.includes(slot.value)}
                    />
                    {slot.label}
                  </label>
                ))}
              </div>
            ) : (
              <p className="rounded-base border-2 border-black bg-attention p-3 text-sm">
                Lege zuerst einen Workshop-Slot an.
              </p>
            )}
          </fieldset>
          <div className="sm:col-span-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export type SlotEditorValues = {
  day?: string
  starts_at?: string
  ends_at?: string
  capacity?: number
}

export function SlotEditorForm({
  default_values: defaultValues = {},
  on_submit: onSubmit,
  submit_label: submitLabel = 'Slot speichern',
  show_day: showDay = true,
}: {
  default_values?: SlotEditorValues
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
  show_day?: boolean
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Slot bearbeiten</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          {showDay ? (
            <WorkshopField label="Tag" name="day" defaultValue={defaultValues.day} />
          ) : null}
          <WorkshopField
            label="Beginn"
            name="starts_at"
            type="datetime-local"
            defaultValue={defaultValues.starts_at}
            required
          />
          <WorkshopField
            label="Ende"
            name="ends_at"
            type="datetime-local"
            defaultValue={defaultValues.ends_at}
            required
          />
          <WorkshopField
            label="Plätze"
            name="capacity"
            type="number"
            min="0"
            defaultValue={defaultValues.capacity ?? 8}
          />
          <div className="sm:col-span-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export type SpaceEditorValues = {
  name?: string
  location?: string
  capacity?: number
  availability_start?: string
  availability_end?: string
  default_capabilities?: readonly string[]
}

export function SpaceEditorForm({
  default_values: defaultValues = {},
  on_submit: onSubmit,
  submit_label: submitLabel = 'Raum speichern',
}: {
  default_values?: SpaceEditorValues
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Raum bearbeiten</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <WorkshopField
              label="Raumname"
              name="name"
              defaultValue={defaultValues.name}
              required
            />
            <WorkshopField
              label="Ort"
              name="location"
              defaultValue={defaultValues.location}
              required
            />
            <WorkshopField
              label="Kapazität"
              name="capacity"
              type="number"
              min="0"
              defaultValue={defaultValues.capacity ?? 8}
            />
            <WorkshopField
              label="Verfügbar ab"
              name="availability_start"
              type="datetime-local"
              defaultValue={defaultValues.availability_start}
            />
            <WorkshopField
              label="Verfügbar bis"
              name="availability_end"
              type="datetime-local"
              defaultValue={defaultValues.availability_end}
            />
          </div>
          <p className="text-sm text-muted">
            Die Ausstattung wird aus den im Profil konfigurierten Fähigkeiten abgeleitet und
            erscheint nach dem Speichern in der Raumübersicht.
          </p>
          <div>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function WorkshopConfirmationDialog({
  open,
  on_open_change: onOpenChange,
  title,
  description,
  confirm_label: confirmLabel = 'Bestätigen',
  on_confirm: onConfirm,
}: {
  open: boolean
  on_open_change: (open: boolean) => void
  title: string
  description: string
  confirm_label?: string
  on_confirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
