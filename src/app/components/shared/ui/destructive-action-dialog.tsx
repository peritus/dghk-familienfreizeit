import type { ComponentProps, ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog.js'

/**
 * The single confirmation pattern for actions that remove or retire data.
 *
 * The trigger remains next to the action it protects; this component owns the
 * consistent consequence copy and safe/danger action ordering.
 */
export function DestructiveActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirm_label: confirmLabel = 'Ja, entfernen',
  cancel_label: cancelLabel = 'Behalten',
  final_focus: finalFocus,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  confirm_label?: string
  cancel_label?: string
  final_focus?: ComponentProps<typeof AlertDialogContent>['finalFocus']
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent finalFocus={finalFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
