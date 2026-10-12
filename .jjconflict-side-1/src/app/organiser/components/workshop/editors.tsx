import { workshopAgeWarning } from '../../../../modules/official-workshops/checks.js'
import { ChoiceField } from '../../../components/shared/ui/field.js'
import { SelectField, TextareaField } from '../../../components/shared/ui/field.js'
import { EntityEditorDialog } from '../../../components/shared/ui/entity-editor-dialog.js'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
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
import { TextField } from '../../../components/shared/ui/field.js'

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
          <ChoiceField
            key={option.value}
            className="flex min-h-11 items-center gap-2 rounded-base border-2 border-border bg-secondary-background px-3"
            type="checkbox"
            name="capabilities"
            value={option.value}
            defaultChecked={defaultValues.includes(option.value)}
            label={<>{option.label}</>}
          />
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
      <TextField
        type="search"
        label="Leitungen durchsuchen"
        placeholder="Leitung suchen …"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div
        aria-describedby="workshop-leader-hint"
        className="grid max-h-56 gap-3 overflow-y-auto rounded-base border-2 border-border bg-secondary-background p-3"
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
                <ChoiceField
                  key={leader.id}
                  className="flex min-h-11 items-center gap-3"
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
                  label={
                    <>
                      <span>
                        {leader.label}
                        {leader.external ? ' (extern)' : ''}
                      </span>
                    </>
                  }
                />
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

export function WorkshopEditorFields({
  default_values: defaultValues = {},
  children,
}: {
  default_values?: WorkshopEditorValues
  children?: ReactNode
}) {
  const [audience, setAudience] = useState(defaultValues.audience ?? 'all')
  const [ageMin, setAgeMin] = useState(defaultValues.age_min ?? 0)
  const [ageMax, setAgeMax] = useState(defaultValues.age_max ?? 120)
  const warning = workshopAgeWarning({ audience, age_min: ageMin, age_max: ageMax })
  return (
    <>
      <TextField label="Titel" name="title" defaultValue={defaultValues.title} required />
      <SelectField
        label="Zielgruppe"
        name="audience"
        value={audience}
        onChange={(event) => setAudience(event.target.value)}
      >
        <option value="all">Alle</option>
        <option value="children">Kinder</option>
        <option value="adults">Erwachsene</option>
      </SelectField>
      <div className="sm:col-span-2">
        <TextareaField
          label="Beschreibung für Familien"
          name="description"
          defaultValue={defaultValues.description}
        />
      </div>
      <TextField
        label="Alter ab"
        name="age_min"
        type="number"
        min="0"
        max="120"
        value={ageMin}
        onChange={(event) => setAgeMin(Number(event.target.value))}
      />
      <TextField
        label="Alter bis"
        name="age_max"
        type="number"
        min="0"
        max="120"
        value={ageMax}
        onChange={(event) => setAgeMax(Number(event.target.value))}
      />
      <TextField
        label="Plätze"
        name="capacity"
        type="number"
        min="0"
        max="200"
        defaultValue={defaultValues.capacity ?? 8}
        hint="Leitungen zählen nicht mit."
      />
      <SelectField
        label="Teilnahme"
        name="participation_mode"
        defaultValue={defaultValues.participation_mode ?? 'assigned'}
      >
        <option value="assigned">Zuordnung</option>
        <option value="sign-up">Anmeldung</option>
        <option value="interest">Interesse</option>
      </SelectField>
      <div className="sm:col-span-2">
        <TextField
          label="Benötigt"
          name="needs"
          defaultValue={defaultValues.needs}
          hint="Mehrere Fähigkeiten mit Komma trennen; die Prüfung erfolgt über den Resolver."
        />
      </div>
      {warning ? (
        <p
          role="status"
          className="sm:col-span-2 rounded-base border-2 border-dashed border-border bg-warning-bg p-3 text-sm"
        >
          {warning} Du kannst diese Angaben speichern.
        </p>
      ) : null}
      {children}
    </>
  )
}

export function WorkshopEditorForm({
  default_values: defaultValues = {},
  on_submit: onSubmit,
  submit_label: submitLabel = 'Kurs speichern',
  children,
}: {
  default_values?: WorkshopEditorValues
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
  children?: ReactNode
}) {
  return (
    <Card className="bg-secondary-background">
      <CardHeader>
        <CardTitle>Kursdaten</CardTitle>
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
  const title = defaultValues.title ? `Kurs bearbeiten: ${defaultValues.title}` : 'Kurs hinzufügen'
  return (
    <EntityEditorDialog
      title={title}
      description="Beschreibung, Zielgruppe und Rahmen für diesen Kurs festlegen."
      open={open}
      on_open_change={onOpenChange}
      on_submit={onSubmit}
      submit_label={submitLabel}
      error={error}
      form_class_name="sm:grid-cols-2"
    >
      <WorkshopEditorFields default_values={defaultValues}>{children}</WorkshopEditorFields>
    </EntityEditorDialog>
  )
}

export type ExternalLeaderEditorValues = {
  name?: string
  phone?: string
  availability?: readonly string[]
}

export function ExternalLeaderEditorFields({
  default_values: defaultValues = {},
  slots = [],
}: {
  default_values?: ExternalLeaderEditorValues
  slots?: readonly { value: string; label: string }[]
}) {
  return (
    <>
      <TextField label="Name" name="name" defaultValue={defaultValues.name} required />
      <TextField
        label="Telefon"
        name="phone"
        type="tel"
        defaultValue={defaultValues.phone}
        hint="Nur für die Organisation sichtbar."
      />
      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="font-bold">Verfügbar</legend>
        {slots.length ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {slots.map((slot) => (
              <ChoiceField
                key={slot.value}
                className="inline-flex min-h-11 items-center gap-2"
                type="checkbox"
                name="availability"
                value={slot.value}
                defaultChecked={defaultValues.availability?.includes(slot.value)}
                control_class_name="size-5 accent-main-deep"
                label={<>{slot.label}</>}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-base border-2 border-border bg-warning-bg text-foreground p-3 text-sm">
            Lege zuerst ein Zeitfenster für einen Kurs an.
          </p>
        )}
      </fieldset>
    </>
  )
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
    <Card className="bg-secondary-background">
      <CardHeader>
        <CardTitle>Externe Leitung</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <ExternalLeaderEditorFields default_values={defaultValues} slots={slots} />
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
  duration_minutes?: number
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
    <Card className="bg-secondary-background">
      <CardHeader>
        <CardTitle>Slot bearbeiten</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          {showDay ? <TextField label="Tag" name="day" defaultValue={defaultValues.day} /> : null}
          <TextField
            label="Beginn"
            name="starts_at"
            type="datetime-local"
            defaultValue={defaultValues.starts_at}
            required
          />
          <TextField
            label="Dauer (Minuten)"
            name="duration_minutes"
            type="number"
            min="1"
            step="1"
            defaultValue={defaultValues.duration_minutes}
            required
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
    <Card className="bg-secondary-background">
      <CardHeader>
        <CardTitle>Raum bearbeiten</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Raumname" name="name" defaultValue={defaultValues.name} required />
            <TextField label="Ort" name="location" defaultValue={defaultValues.location} required />
            <TextField
              label="Kapazität"
              name="capacity"
              type="number"
              min="0"
              defaultValue={defaultValues.capacity ?? 8}
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
