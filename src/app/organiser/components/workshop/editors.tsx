import type { FormEvent, ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog.js'
import { Button } from '../../../components/ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.js'
import { WorkshopField } from './shared.js'

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
  return (
    <label className="grid gap-1 font-bold">
      Leitungen
      <span className="text-sm font-normal text-muted">
        Mehrere Personen oder externe Leitungen mit Strg/Cmd auswählen.
      </span>
      <select
        name="leader_ids"
        multiple
        size={Math.min(6, Math.max(3, leaders.length))}
        defaultValue={selectedIds}
        className={`${controlClass} min-h-24 py-2`}
      >
        {leaders.map((leader) => (
          <option key={leader.id} value={leader.id}>
            {leader.label}
            {leader.external ? ' (extern)' : ''}
          </option>
        ))}
      </select>
    </label>
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

export function WorkshopEditorForm({
  default_values: defaultValues = {},
  on_submit: onSubmit,
  submit_label: submitLabel = 'Workshop speichern',
}: {
  default_values?: WorkshopEditorValues
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Workshopdaten</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
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
              label="Beschreibung"
              name="description"
              default_value={defaultValues.description}
            />
          </div>
          <WorkshopField
            label="Kapazität"
            name="capacity"
            type="number"
            min="0"
            defaultValue={defaultValues.capacity ?? 8}
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
          <WorkshopField
            label="Mindestalter"
            name="age_min"
            type="number"
            min="0"
            defaultValue={defaultValues.age_min ?? 0}
          />
          <WorkshopField
            label="Höchstalter"
            name="age_max"
            type="number"
            min="0"
            defaultValue={defaultValues.age_max ?? 120}
          />
          <div className="sm:col-span-2">
            <WorkshopField
              label="Benötigt"
              name="needs"
              defaultValue={defaultValues.needs}
              hint="Mehrere Fähigkeiten mit Komma trennen; die Prüfung erfolgt über den Resolver."
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export type ExternalLeaderEditorValues = {
  name?: string
  email?: string
  phone?: string
  notes?: string
}

export function ExternalLeaderEditorForm({
  default_values: defaultValues = {},
  on_submit: onSubmit,
  submit_label: submitLabel = 'Externe Leitung speichern',
}: {
  default_values?: ExternalLeaderEditorValues
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
            label="E-Mail"
            name="email"
            type="email"
            defaultValue={defaultValues.email}
          />
          <WorkshopField
            label="Telefon"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
          />
          <WorkshopTextareaField
            label="Notizen"
            name="notes"
            default_value={defaultValues.notes}
            hint="Nur organisatorische Hinweise, keine vertraulichen Notizen."
          />
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
}: {
  default_values?: SlotEditorValues
  on_submit: (event: FormEvent<HTMLFormElement>) => void
  submit_label?: string
}) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Slot bearbeiten</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <WorkshopField label="Tag" name="day" defaultValue={defaultValues.day} required />
          <WorkshopField
            label="Beginn"
            name="starts_at"
            type="time"
            defaultValue={defaultValues.starts_at}
            required
          />
          <WorkshopField
            label="Ende"
            name="ends_at"
            type="time"
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
              label="Kapazität"
              name="capacity"
              type="number"
              min="0"
              defaultValue={defaultValues.capacity ?? 8}
            />
          </div>
          <WorkshopCheckboxGroup
            legend="Ausstattung"
            default_values={defaultValues.default_capabilities}
            options={[
              { value: 'indoor', label: 'Innenraum' },
              { value: 'outdoor', label: 'Außenbereich' },
              { value: 'accessible', label: 'Barrierearm' },
              { value: 'water', label: 'Wasseranschluss' },
            ]}
          />
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
