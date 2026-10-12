import { useId, useState } from 'react'
import { Button } from './button.js'
export type EntityPickerOption = { value: string; label: string; group?: string }

function optionGroups(options: readonly EntityPickerOption[]) {
  const groups: { label: string | undefined; options: EntityPickerOption[] }[] = []
  for (const option of options) {
    const last = groups.at(-1)
    if (last && last.label === option.group) last.options.push(option)
    else groups.push({ label: option.group, options: [option] })
  }
  return groups
}

function ListSearchInput({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly EntityPickerOption[]
  onChange: (value: string) => void
}) {
  const listId = useId()
  const [text, setText] = useState(options.find((option) => option.value === value)?.label ?? '')
  // Commit only on a complete name, as the prototype's change event does: picking a
  // datalist entry, pressing Enter, or leaving the field.
  const commit = (candidate: string) => {
    const match = options.find((option) => option.label === candidate.trim())
    if (match && match.value !== value) onChange(match.value)
  }
  return (
    <>
      <input
        type="search"
        list={listId}
        autoComplete="off"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const inputType = (event.nativeEvent as InputEvent).inputType
          if (!inputType || inputType === 'insertReplacementText') commit(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value)
        }}
        onBlur={(event) => commit(event.currentTarget.value)}
        className="h-11 w-full rounded-base border-2 border-border bg-secondary-background px-3 text-body font-normal leading-tight"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.label} />
        ))}
      </datalist>
    </>
  )
}

export function EntityPicker({
  label,
  value,
  options,
  onChange,
  search = false,
  onPrevious,
  onNext,
}: {
  label: string
  value: string
  options: readonly EntityPickerOption[]
  onChange: (value: string) => void
  /** Use a search field with suggestions instead of a select, for long lists of people. */
  search?: boolean
  onPrevious?: () => void
  onNext?: () => void
}) {
  const index = options.findIndex((option) => option.value === value)
  const previous = index > 0 ? options[index - 1] : undefined
  const next = index >= 0 ? options[index + 1] : undefined
  return (
    <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3">
      <label className="grid w-full max-w-[480px] flex-[1_1_320px] gap-1.5 text-sm leading-tight font-bold">
        {label}
        {search ? (
          <ListSearchInput key={value} value={value} options={options} onChange={onChange} />
        ) : (
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="select-chevron h-11 w-full rounded-base border-2 border-border bg-secondary-background pl-3 text-body font-normal leading-tight"
          >
            {optionGroups(options).map((group, groupIndex) => {
              const items = group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
              return group.label ? (
                <optgroup key={`${group.label}-${groupIndex}`} label={group.label}>
                  {items}
                </optgroup>
              ) : (
                items
              )
            })}
          </select>
        )}
      </label>
      {onPrevious && previous ? (
        <Button type="button" size="sm" variant="neutral" onClick={onPrevious}>
          ‹ Vorherige<span className="sr-only">: {previous.label}</span>
        </Button>
      ) : null}
      {onNext && next ? (
        <Button type="button" size="sm" variant="neutral" onClick={onNext}>
          Nächste ›<span className="sr-only">: {next.label}</span>
        </Button>
      ) : null}
    </div>
  )
}
