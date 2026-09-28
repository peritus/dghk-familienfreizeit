import type { ComponentProps, ReactNode } from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { cn } from '@/lib/utils'
import { Button, type buttonVariants } from './button'
import type { VariantProps } from 'class-variance-authority'

/**
 * The neobrutalist "Neobrutalist component contract" from
 * spec/ui/design-system.md, finally built: strong black outlines, offset
 * shadows, direct labels, deliberate primary actions. Composes Base UI's
 * AlertDialog (portal, backdrop, focus trap, Esc/outside-click handling)
 * with our own Button through its `render` prop, the same pattern already
 * used for the save-status popover.
 */
export const AlertDialog = AlertDialogPrimitive.Root

export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

export function AlertDialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Popup>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className="fixed inset-0 bg-black/40" />
      <AlertDialogPrimitive.Viewport className="fixed inset-0 flex items-center justify-center p-4">
        <AlertDialogPrimitive.Popup
          className={cn(
            'w-full max-w-md space-y-4 rounded-base border-2 border-black bg-white p-6 shadow-shadow',
            className,
          )}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  )
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('space-y-2', className)} {...props} />
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap justify-end gap-2', className)} {...props} />
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn('text-xl font-heading', className)} {...props} />
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description className={cn('text-foreground', className)} {...props} />
  )
}

type AlertDialogButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { children: ReactNode }

export function AlertDialogCancel({ variant = 'neutral', ...props }: AlertDialogButtonProps) {
  return <AlertDialogPrimitive.Close render={<Button variant={variant} {...props} />} />
}

export function AlertDialogAction({ variant = 'danger', ...props }: AlertDialogButtonProps) {
  return <AlertDialogPrimitive.Close render={<Button variant={variant} {...props} />} />
}
