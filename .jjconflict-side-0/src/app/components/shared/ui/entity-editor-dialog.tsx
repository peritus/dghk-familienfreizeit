import { useId, type FormEventHandler, type ReactElement, type ReactNode } from 'react'
import { Button } from './button.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog.js'
import { cn } from '../../../lib/utils.js'

export type EntityEditorDialogProps = {
  title: string
  description?: string
  submit_label?: string
  open: boolean
  on_open_change: (open: boolean) => void
  on_submit?: FormEventHandler<HTMLFormElement>
  error?: ReactNode
  children: ReactNode
  trigger?: ReactElement
  form_class_name?: string
}

/** Shared form/dialog frame; callers own their entity commands and validation. */
export function EntityEditorDialog({
  title,
  description,
  submit_label: submitLabel = 'Hinzufügen',
  open,
  on_open_change: onOpenChange,
  on_submit: onSubmit,
  error,
  children,
  trigger,
  form_class_name: formClassName,
}: EntityEditorDialogProps) {
  const generatedId = useId()
  const formId = `entity-editor-${generatedId.replaceAll(':', '')}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          {error ? (
            <p
              role="alert"
              className="rounded-base border-2 border-border bg-danger p-3 text-danger-foreground"
            >
              {error}
            </p>
          ) : null}
        </DialogHeader>
        {onSubmit ? (
          <form id={formId} className={cn('mt-5 grid gap-4', formClassName)} onSubmit={onSubmit}>
            {children}
          </form>
        ) : (
          children
        )}
        {onSubmit ? (
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
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
