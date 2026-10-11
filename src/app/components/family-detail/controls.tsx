import { useState } from 'react'
import type {
  PreferenceControl,
  PreferenceAnswer,
  FamilyDetailActions,
  FamilyDetailData,
} from '../../../family-detail/model.js'
import { ChoiceField, SelectField, TextareaField } from '../shared/ui/field.js'
import { Button } from '../shared/ui/button.js'
import { Card, CardContent, CardHeader } from '../shared/ui/card.js'

export function PreferenceField({
  control,
  actions,
  defer_text: deferText = false,
}: {
  control: PreferenceControl
  actions: FamilyDetailActions
  defer_text?: boolean
}) {
  const current = control.answer.values[0]
  const saved = typeof current?.value === 'string' ? current.value : ''
  const [buffer, setBuffer] = useState({ saved, value: saved })
  const text = buffer.saved === saved ? buffer.value : saved
  const setText = (value: string) => setBuffer({ saved, value })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = control.disabled || pending
  async function commit(answer: PreferenceAnswer) {
    setPending(true)
    setError(null)
    try {
      await actions.change({
        type: 'preference',
        target_id: control.target_id,
        key: control.key,
        answer,
      })
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Die Angabe konnte nicht gespeichert werden.',
      )
      setText(typeof current?.value === 'string' ? current.value : '')
    } finally {
      setPending(false)
    }
  }
  const one = (
    value: PreferenceControl['options'][number]['value'],
    strength: 'required' | 'preferred' | null = null,
  ) => ({ values: [{ value, strength }], answered: true })
  const hint = (
    <>
      {control.help ? <span className="block text-sm">{control.help}</span> : null}
      {control.disabled_reason ? (
        <span className="block text-sm" role="note">
          {control.disabled_reason}
        </span>
      ) : null}
      {error ? (
        <span className="block text-sm" role="alert">
          {error}
        </span>
      ) : null}
    </>
  )
  if (control.kind === 'free-text')
    return (
      <div className="grid gap-2">
        <TextareaField
          label={control.title}
          hint={hint}
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => {
            if (!deferText && text !== String(current?.value ?? ''))
              void commit(text.trim() ? one(text.trim()) : { values: [], answered: false })
          }}
        />
        {deferText ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={disabled || text === String(current?.value ?? '')}
              onClick={() =>
                void commit(text.trim() ? one(text.trim()) : { values: [], answered: false })
              }
            >
              Speichern
            </Button>
            <Button
              type="button"
              variant="neutral"
              disabled={disabled || text === String(current?.value ?? '')}
              onClick={() => setText(String(current?.value ?? ''))}
            >
              Verwerfen
            </Button>
          </div>
        ) : null}
      </div>
    )
  if (control.kind === 'toggle')
    return (
      <ChoiceField
        className="flex min-h-11 items-center gap-3"
        type="checkbox"
        checked={current?.value === true}
        disabled={disabled}
        onChange={(event) =>
          void commit(event.target.checked ? one(true) : { values: [], answered: false })
        }
        label={
          <span>
            <strong>{control.title}</strong>
            {hint}
          </span>
        }
      />
    )
  if (control.kind === 'tri-state') {
    const selected = current?.strength ?? (control.answer.answered ? 'indifferent' : 'none')
    const choices = [
      { value: 'none', label: 'Keine Angabe' },
      ...(control.strengths.includes('required')
        ? [{ value: 'required', label: control.invert ? 'Auf keinen Fall' : 'Unbedingt' }]
        : []),
      ...(control.strengths.includes('preferred')
        ? [{ value: 'preferred', label: control.invert ? 'Lieber nicht' : 'Gerne' }]
        : []),
      { value: 'indifferent', label: control.invert ? 'Gerne' : 'Egal' },
    ]
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{control.title}</legend>
        {hint}
        <div className="flex flex-wrap gap-3">
          {choices.map((choice) => (
            <ChoiceField
              className="flex min-h-11 items-center gap-3"
              key={choice.value}
              type="radio"
              name={`${control.target_id}-${control.key}`}
              checked={selected === choice.value}
              label={choice.label}
              onChange={() =>
                void commit(
                  choice.value === 'none'
                    ? { values: [], answered: false }
                    : choice.value === 'indifferent'
                      ? { values: [], answered: true }
                      : one(
                          control.options[0]?.value ?? true,
                          choice.value as 'required' | 'preferred',
                        ),
                )
              }
            />
          ))}
        </div>
      </fieldset>
    )
  }
  if (control.kind === 'person-picker' || control.kind === 'family-picker')
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{control.title}</legend>
        {hint}
        {control.options.map((option) => (
          <ChoiceField
            className="flex min-h-11 items-center gap-3"
            key={String(option.value)}
            type="checkbox"
            checked={control.answer.values.some((item) => item.value === option.value)}
            label={option.label}
            onChange={(event) => {
              const next = control.answer.values.filter((item) => item.value !== option.value)
              if (event.target.checked) next.push({ value: option.value, strength: 'required' })
              void commit({ values: next, answered: next.length > 0 })
            }}
          />
        ))}
      </fieldset>
    )
  if (control.kind === 'choice')
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{control.title}</legend>
        {hint}
        <div className="flex flex-wrap gap-2">
          <ChoiceField
            className="flex min-h-11 items-center gap-2 rounded-base border-2 border-border px-3 font-bold"
            type="radio"
            name={`${control.target_id}-${control.key}`}
            checked={!current}
            label="Keine Angabe"
            onChange={() => void commit({ values: [], answered: false })}
          />
          {control.options.map((option) => (
            <ChoiceField
              className="flex min-h-11 items-center gap-2 rounded-base border-2 border-border px-3 font-bold"
              key={String(option.value)}
              type="radio"
              name={`${control.target_id}-${control.key}`}
              checked={current?.value === option.value}
              label={option.label}
              onChange={() => void commit(one(option.value))}
            />
          ))}
        </div>
      </fieldset>
    )
  return (
    <SelectField
      label={control.title}
      hint={hint}
      value={String(current?.value ?? '')}
      disabled={disabled}
      onChange={(event) =>
        void commit(event.target.value ? one(event.target.value) : { values: [], answered: false })
      }
    >
      <option value="">—</option>
      {control.options.map((option) => (
        <option key={String(option.value)} value={String(option.value)}>
          {option.label}
        </option>
      ))}
    </SelectField>
  )
}

export function DetailPreferences({
  data,
  actions,
  section_keys: sectionKeys,
  trait_keys: traitKeys,
  person_id: personId,
  defer_text: deferText = false,
}: {
  data: FamilyDetailData
  actions: FamilyDetailActions
  section_keys: readonly string[]
  trait_keys?: readonly string[]
  person_id?: string
  defer_text?: boolean
}) {
  return (
    <div className="space-y-4">
      {data.sections
        .filter((section) => section.visible && sectionKeys.includes(section.key))
        .map((section) => {
          const controls = Object.values(data.preferences)
            .flatMap((items) => Object.values(items))
            .filter(
              (control) =>
                (personId
                  ? control.target_id === personId
                  : control.target_id === data.family.id ||
                    data.people.some((person) => person.id === control.target_id)) &&
                (!traitKeys || traitKeys.includes(control.key)),
            )
          const sectionControls = controls.filter((control) => control.section_key === section.key)
          return (
            <Card key={section.key} className="bg-secondary-background">
              <CardHeader>
                <h3 className="text-metric">{section.title}</h3>
                {section.intro ? <p>{section.intro}</p> : null}
                {section.notice ? <p role="note">{section.notice}</p> : null}
              </CardHeader>
              <CardContent className="grid gap-5">
                {sectionControls.map((control) => (
                  <PreferenceField
                    key={`${control.target_id}-${control.key}`}
                    control={control}
                    actions={actions}
                    defer_text={deferText}
                  />
                ))}
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
