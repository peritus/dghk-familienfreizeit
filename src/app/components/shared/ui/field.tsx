import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../../lib/utils.js'

type FieldProps = { label: string; hint?: ReactNode; error?: ReactNode; id?: string }

type FieldControlProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: FieldProps & { children: (props: FieldControlProps) => ReactNode }) {
  const generatedId = useId()
  const fieldId = id ?? `field-${generatedId}`
  const descriptions =
    [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <div data-slot="form-field" className="grid gap-1">
      <label htmlFor={fieldId} className="font-bold">
        {label}
      </label>
      {children({
        id: fieldId,
        'aria-describedby': descriptions,
        'aria-invalid': error ? true : undefined,
      })}
      {hint ? (
        <p id={`${fieldId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm font-bold text-danger-foreground">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const fieldControlClass =
  'min-h-11 w-full min-w-0 rounded-base border-2 border-border bg-input px-3 font-normal'

export type TextFieldProps = FieldProps & ComponentProps<'input'>

export function TextField({ label, hint, error, id, className, ...props }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(control) => (
        <input
          {...props}
          {...control}
          aria-describedby={
            [control['aria-describedby'], props['aria-describedby']].filter(Boolean).join(' ') ||
            undefined
          }
          aria-invalid={control['aria-invalid'] ?? props['aria-invalid']}
          className={cn(fieldControlClass, className)}
        />
      )}
    </Field>
  )
}

export function SelectField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldProps & ComponentProps<'select'>) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(control) => (
        <select
          {...props}
          {...control}
          aria-describedby={
            [control['aria-describedby'], props['aria-describedby']].filter(Boolean).join(' ') ||
            undefined
          }
          aria-invalid={control['aria-invalid'] ?? props['aria-invalid']}
          className={cn(fieldControlClass, 'select-chevron', className)}
        />
      )}
    </Field>
  )
}

export function TextareaField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldProps & ComponentProps<'textarea'>) {
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(control) => (
        <textarea
          {...props}
          {...control}
          aria-describedby={
            [control['aria-describedby'], props['aria-describedby']].filter(Boolean).join(' ') ||
            undefined
          }
          aria-invalid={control['aria-invalid'] ?? props['aria-invalid']}
          className={cn(fieldControlClass, 'min-h-24 py-2', className)}
        />
      )}
    </Field>
  )
}
