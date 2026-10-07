import { useId, type FormEventHandler, type ReactNode } from 'react'
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

export function CollectionCreateAction({
  label,
  title,
  description,
  submit_label: submitLabel,
  open,
  on_open_change: onOpenChange,
  on_submit: onSubmit,
  error,
  children,
}: {
  label: string
  title: string
  description?: string
  submit_label?: string
  open: boolean
  on_open_change: (open: boolean) => void
  on_submit?: FormEventHandler<HTMLFormElement>
  error?: string | null
  children: ReactNode
}) {
  const generatedId = useId()
  const formId = `collection-create-${generatedId.replaceAll(':', '')}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button type="button">{label}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          {error ? (
            <p
              role="alert"
              className="rounded-base border-2 border-border bg-danger text-danger-foreground p-3"
            >
              {error}
            </p>
          ) : null}
        </DialogHeader>
        {onSubmit ? (
          <form id={formId} className="mt-5 grid gap-4" onSubmit={onSubmit}>
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
