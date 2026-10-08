import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/shared/ui/alert-dialog.js'
import { Button } from '../../components/shared/ui/button.js'

/**
 * Confirms one organiser phase decision — opening workshop choice, closing, or reopening an
 * area (spec/architecture/phases.md §5). Previewing appends nothing; only confirming calls
 * `on_confirm`, which stages the decision's event like any other organiser edit. `disabled`
 * blocks only the confirmation, so the review still explains why.
 */
export function PhaseDecisionAction({
  label,
  title,
  description,
  confirm_label: confirmLabel,
  disabled = false,
  on_confirm: onConfirm,
  children,
  on_open_change: onOpenChange,
}: {
  label: string
  title: string
  description: ReactNode
  confirm_label: string
  disabled?: boolean
  on_confirm: () => void
  children?: ReactNode
  on_open_change?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={(value) => { setOpen(value); onOpenChange?.(value) }}>
      <Button type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled}
            onClick={() => {
              onConfirm()
              setOpen(false)
              onOpenChange?.(false)
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
